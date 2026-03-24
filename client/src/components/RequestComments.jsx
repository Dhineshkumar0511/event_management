import { useState, useEffect, useRef } from 'react'
import { featuresAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function RequestComments({ entityType, entityId }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { if (entityType && entityId) loadComments() }, [entityType, entityId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  const loadComments = async () => {
    setLoading(true)
    try { const res = await featuresAPI.getComments(entityType, entityId); setComments(res.data.data || []) }
    catch {} finally { setLoading(false) }
  }

  const sendComment = async () => {
    if (!newComment.trim()) return
    setSending(true)
    try {
      const res = await featuresAPI.postComment({ entity_type: entityType, entity_id: entityId, message: newComment.trim() })
      if (res.data.success) { setComments(prev => [...prev, res.data.data]); setNewComment('') }
    } catch {} finally { setSending(false) }
  }

  const roleAvatar = {
    student: 'from-accent-cyan to-accent-purple',
    staff: 'from-accent-green to-accent-cyan',
    hod: 'from-accent-purple to-accent-magenta',
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-accent-purple" />
        <h3 className="font-bold text-white/80 text-sm">Discussion ({comments.length})</h3>
      </div>

      {/* Messages */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-accent-purple border-t-transparent rounded-full mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-4">No comments yet. Start the discussion!</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`flex gap-2.5 ${c.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roleAvatar[c.user_role] || roleAvatar.student} flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow`}>
                {c.user_name?.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                c.user_id === user?.id
                  ? 'bg-gradient-to-r from-accent-purple/20 to-accent-magenta/15 border border-accent-purple/15'
                  : 'bg-white/[0.04] border border-white/[0.06]'
              }`}>
                <div className="text-[10px] font-bold mb-0.5 text-white/30 uppercase tracking-wider">
                  {c.user_name} · {c.user_role}
                </div>
                <p className="text-sm whitespace-pre-wrap text-white/70">{c.message}</p>
                <p className="text-[10px] mt-1 text-white/15 font-mono">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex gap-2">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
          placeholder="Type a message..."
          className="input flex-1 !py-2 text-sm"
          disabled={sending}
        />
        <button
          onClick={sendComment}
          disabled={!newComment.trim() || sending}
          className="btn btn-primary !px-3 !py-2 disabled:opacity-30"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
