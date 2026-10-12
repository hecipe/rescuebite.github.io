import { useState, useEffect } from 'react'
import { Send, MessageSquare, User, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, parseError } from '@/lib/utils'

interface TicketNote {
  id: string
  ticket_id: string
  author_id: string
  body: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

interface TicketNotesListProps {
  ticketId: string
}

export function TicketNotesList({ ticketId }: TicketNotesListProps) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<TicketNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketId) return
    fetchNotes()
  }, [ticketId])

  async function fetchNotes() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('ticket_notes')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (err) throw err
      setNotes((data as TicketNote[]) || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim() || !user) return

    setSubmitting(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('ticket_notes').insert({
        ticket_id: ticketId,
        author_id: user.id,
        body: newNote.trim(),
      })

      if (insErr) throw insErr

      setNewNote('')
      await fetchNotes()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          Ghi chú nội bộ ({notes.length})
        </h4>
        <span className="text-[10px] text-slate-400">Chỉ nhân viên hỗ trợ nhìn thấy</span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* List of notes */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-slate-400 py-2">Đang tải ghi chú...</p>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-center text-xs text-slate-400">
            Chưa có ghi chú nội bộ nào cho phiếu này.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border bg-slate-50/70 p-3 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Nhân viên hỗ trợ
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(note.created_at)}
                </span>
              </div>
              <p className="text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
                {note.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleAddNote} className="space-y-2 pt-1 border-t border-slate-100">
        <Textarea
          rows={2}
          placeholder="Thêm ghi chú nội bộ (VD: Đã liên hệ khách, khách xác nhận quán thiếu món...)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="brand"
            disabled={submitting || !newNote.trim()}
            className="text-xs h-8 gap-1"
          >
            <Send className="h-3 w-3" />
            {submitting ? 'Đang lưu...' : 'Gửi ghi chú'}
          </Button>
        </div>
      </form>
    </div>
  )
}
