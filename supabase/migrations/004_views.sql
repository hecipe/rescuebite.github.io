-- 004_views.sql
-- Analytics views

-- ============================================================
-- V_BUYER_SEGMENTS
-- Segments buyers based on order recency and frequency
-- ============================================================
create or replace view v_buyer_segments as
with buyer_stats as (
  select
    o.buyer_id,
    p.full_name,
    count(*) filter (where o.status = 'PICKED_UP') as total_pickups,
    max(o.created_at) as last_order_at,
    min(o.created_at) as first_order_at
  from orders o
  join profiles p on p.auth_user_id = o.buyer_id
  where o.status not in ('CANCELLED', 'PENDING_PAYMENT')
  group by o.buyer_id, p.full_name
)
select
  buyer_id,
  full_name,
  total_pickups,
  last_order_at,
  first_order_at,
  case
    when first_order_at >= now() - interval '14 days' then 'Mới'
    when total_pickups >= 5 and last_order_at >= now() - interval '30 days' then 'Thân thiết'
    when last_order_at >= now() - interval '30 days' then 'Đang hoạt động'
    when last_order_at >= now() - interval '60 days' then 'Có nguy cơ rời bỏ'
    else 'Đã rời bỏ'
  end as segment
from buyer_stats;

-- ============================================================
-- V_STORE_QUALITY
-- Quality score = 50% avg_rating/5 + 30% (1-complaint_rate) + 20% matched_description_rate
-- ============================================================
create or replace view v_store_quality as
with store_stats as (
  select
    s.id as store_id,
    s.name as store_name,
    s.district,
    s.rank_penalty,
    count(r.id) as review_count,
    coalesce(avg(r.rating), 0) as avg_rating,
    count(t.id) as complaint_count,
    count(o.id) filter (where o.status = 'PICKED_UP') as pickup_count,
    count(r.id) filter (where r.matched_description = true) as matched_count
  from stores s
  left join bags b on b.store_id = s.id
  left join orders o on o.bag_id = b.id
  left join reviews r on r.store_id = s.id
  left join tickets t on t.order_id = o.id and t.category != 'khác'
  where s.status = 'approved'
  group by s.id, s.name, s.district, s.rank_penalty
),
scored as (
  select
    store_id, store_name, district, rank_penalty,
    review_count, avg_rating, complaint_count, pickup_count, matched_count,
    round(
      (50.0 * avg_rating / 5.0) +
      (30.0 * (1.0 - case when pickup_count > 0 then complaint_count::numeric / pickup_count else 0 end)) +
      (20.0 * (case when review_count > 0 then matched_count::numeric / review_count else 1 end))
    , 1) as quality_score
  from store_stats
)
select
  store_id, store_name, district, rank_penalty,
  review_count, avg_rating, complaint_count, pickup_count, matched_count,
  quality_score,
  case
    when quality_score >= 70 then 'Tốt'
    when quality_score >= 55 then 'Cần nhắc nhở'
    else 'Giảm ưu tiên hiển thị'
  end as quality_status
from scored;

-- ============================================================
-- V_SERVQUAL_GAPS
-- Per dimension: avg expectation, avg perception, gap
-- ============================================================
create or replace view v_servqual_gaps as
select
  'Phương tiện hữu hình' as dimension,
  1 as dim_order,
  round(avg(dim1_exp)::numeric, 2) as avg_expectation,
  round(avg(dim1_perc)::numeric, 2) as avg_perception,
  round((avg(dim1_perc) - avg(dim1_exp))::numeric, 2) as gap
from survey_responses
union all
select
  'Độ tin cậy', 2,
  round(avg(dim2_exp)::numeric, 2),
  round(avg(dim2_perc)::numeric, 2),
  round((avg(dim2_perc) - avg(dim2_exp))::numeric, 2)
from survey_responses
union all
select
  'Khả năng đáp ứng', 3,
  round(avg(dim3_exp)::numeric, 2),
  round(avg(dim3_perc)::numeric, 2),
  round((avg(dim3_perc) - avg(dim3_exp))::numeric, 2)
from survey_responses
union all
select
  'Sự đảm bảo', 4,
  round(avg(dim4_exp)::numeric, 2),
  round(avg(dim4_perc)::numeric, 2),
  round((avg(dim4_perc) - avg(dim4_exp))::numeric, 2)
from survey_responses
union all
select
  'Sự đồng cảm', 5,
  round(avg(dim5_exp)::numeric, 2),
  round(avg(dim5_perc)::numeric, 2),
  round((avg(dim5_perc) - avg(dim5_exp))::numeric, 2)
from survey_responses
order by dim_order;

-- ============================================================
-- V_STORE_REVENUE
-- Revenue per store
-- ============================================================
create or replace view v_store_revenue as
select
  s.id as store_id,
  s.name as store_name,
  s.district,
  count(o.id) filter (where o.status = 'PICKED_UP') as picked_up_count,
  coalesce(sum(o.total_price) filter (where o.status = 'PICKED_UP'), 0) as gross_revenue,
  coalesce(sum(o.total_price) filter (where o.status = 'PICKED_UP'), 0) *
    (select value::numeric / 100 from app_settings where key = 'commission_pct') as commission,
  coalesce(sum(o.total_price) filter (where o.status = 'PICKED_UP'), 0) *
    (1 - (select value::numeric / 100 from app_settings where key = 'commission_pct')) as net_revenue
from stores s
left join bags b on b.store_id = s.id
left join orders o on o.bag_id = b.id
where s.status = 'approved'
group by s.id, s.name, s.district;

-- ============================================================
-- V_GOAL_KPIS
-- Aggregated KPIs vs targets
-- ============================================================
create or replace view v_goal_kpis as
with stats as (
  select
    -- sell-through rate: ordered / posted
    case when sum(b.quantity) > 0
      then round(100.0 * sum(b.quantity - b.remaining) / sum(b.quantity), 1)
      else 0 end as sell_through_rate,
    -- pickup completion: PICKED_UP / (PICKED_UP + NO_SHOW)
    case when count(o.id) filter (where o.status in ('PICKED_UP','NO_SHOW')) > 0
      then round(100.0 * count(o.id) filter (where o.status = 'PICKED_UP') /
           count(o.id) filter (where o.status in ('PICKED_UP','NO_SHOW')), 1)
      else 0 end as pickup_completion_rate,
    count(distinct o.id) filter (where o.status = 'PICKED_UP') as bags_rescued,
    count(distinct o.id) filter (where o.status = 'PICKED_UP') * 2.7 as co2e_avoided_kg,
    sum(o.total_price) filter (where o.status = 'PICKED_UP') as gross_revenue
  from bags b
  left join orders o on o.bag_id = b.id
),
review_stats as (
  select
    round(avg(rating)::numeric, 2) as average_rating,
    count(*) as review_count
  from reviews
),
complaint_stats as (
  select
    case when count(o.id) filter (where o.status = 'PICKED_UP') > 0
      then round(100.0 * count(t.id) / count(o.id) filter (where o.status = 'PICKED_UP'), 2)
      else 0 end as complaint_rate
  from orders o
  left join tickets t on t.order_id = o.id and t.category != 'khác'
),
repeat_stats as (
  select
    case when count(distinct buyer_id) > 0
      then round(100.0 * count(distinct buyer_id) filter (
        where buyer_id in (
          select buyer_id from orders
          where status = 'PICKED_UP'
          and created_at >= now() - interval '30 days'
          group by buyer_id having count(*) >= 2
        )
      ) / count(distinct buyer_id), 1)
      else 0 end as repeat_purchase_30d
  from orders
  where status = 'PICKED_UP'
    and created_at >= now() - interval '30 days'
),
partner_stats as (
  select
    count(distinct s.id) filter (where s.status = 'approved') as total_approved,
    count(distinct b.store_id) filter (
      where b.status = 'OPEN' or b.updated_at >= now() - interval '7 days'
    ) as active_partners
  from stores s
  left join bags b on b.store_id = s.id
)
select
  g.metric,
  g.target,
  g.unit,
  case g.metric
    when 'sell_through_rate'      then s.sell_through_rate
    when 'pickup_completion_rate' then s.pickup_completion_rate
    when 'active_partner_rate'    then case when p.total_approved > 0
                                       then round(100.0 * p.active_partners / p.total_approved, 1)
                                       else 0 end
    when 'average_rating'         then r.average_rating
    when 'complaint_rate'         then c.complaint_rate
    when 'repeat_purchase_30d'    then rp.repeat_purchase_30d
    when 'bags_rescued'           then s.bags_rescued
    when 'co2e_avoided_kg'        then s.co2e_avoided_kg
    when 'fee_revenue_vnd'        then s.gross_revenue *
                                    (select value::numeric / 100 from app_settings where key = 'commission_pct')
    else 0
  end as current_value
from goals_targets g
cross join stats s
cross join review_stats r
cross join complaint_stats c
cross join repeat_stats rp
cross join partner_stats p;
