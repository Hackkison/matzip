'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle } from 'lucide-react'

interface Inquiry {
  id: string
  type: 'bug' | 'suggestion'
  title: string
  content: string
  created_at: string
  admin_reply: string | null
  replied_at: string | null
}

const TYPE_LABELS: Record<'bug' | 'suggestion', string> = {
  bug: '오류 신고',
  suggestion: '건의사항',
}

interface Props {
  isLoggedIn: boolean
  onClose: () => void
}

export default function InquiryModal({ isLoggedIn, onClose }: Props) {
  const [view, setView] = useState<'write' | 'list'>('write')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [type, setType] = useState<'bug' | 'suggestion'>('bug')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const fetchInquiries = async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/inquiries')
      if (res.ok) setInquiries(await res.json())
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (view === 'list' && isLoggedIn) fetchInquiries()
  }, [view, isLoggedIn])

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (content.trim().length < 5) { setError('내용을 5자 이상 입력해주세요'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim(), content: content.trim() }),
      })
      if (!res.ok) { setError('등록에 실패했습니다'); return }
      setSubmitted(true)
      setTitle('')
      setContent('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-semibold text-zinc-800">고객센터</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        {/* 비로그인 */}
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
            <MessageCircle size={32} className="text-zinc-300" />
            <p className="text-sm text-zinc-500">로그인 후 문의하실 수 있습니다</p>
            <a
              href="/login"
              className="px-5 py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg"
            >
              로그인하기
            </a>
          </div>
        ) : (
          <>
            {/* 탭 */}
            <div className="flex border-b border-zinc-100 shrink-0">
              {(['write', 'list'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setView(v); setSubmitted(false) }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    view === v
                      ? 'text-[#1B4332] border-b-2 border-[#1B4332]'
                      : 'text-zinc-400'
                  }`}
                >
                  {v === 'write' ? '문의하기' : '내 문의 내역'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* 문의 작성 탭 */}
              {view === 'write' && (
                <div className="p-4 flex flex-col gap-4">
                  {submitted ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <div className="w-12 h-12 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                        <MessageCircle size={20} className="text-[#1B4332]" />
                      </div>
                      <p className="text-sm font-medium text-zinc-800">문의가 접수되었습니다</p>
                      <p className="text-xs text-zinc-400 text-center">
                        관리자 확인 후 답변드릴게요.<br />내 문의 내역에서 확인하실 수 있어요.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="mt-1 text-xs text-[#1B4332] underline underline-offset-2"
                      >
                        새 문의 작성
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* 유형 선택 */}
                      <div>
                        <label className="text-sm font-medium text-zinc-700 mb-1.5 block">유형</label>
                        <div className="flex gap-2">
                          {(['bug', 'suggestion'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setType(t)}
                              className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                                type === t
                                  ? 'bg-[#1B4332] text-white border-[#1B4332]'
                                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              {TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 제목 */}
                      <div>
                        <label className="text-sm font-medium text-zinc-700 mb-1.5 block">제목</label>
                        <input
                          type="text"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="문의 제목을 입력하세요"
                          maxLength={100}
                          className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                        />
                      </div>
                      {/* 내용 */}
                      <div>
                        <label className="text-sm font-medium text-zinc-700 mb-1.5 block">내용</label>
                        <textarea
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          placeholder="문의 내용을 자세히 작성해주세요"
                          maxLength={1000}
                          rows={5}
                          className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] resize-none"
                        />
                        <p className="text-right text-[10px] text-zinc-300 mt-0.5">{content.length}/1000</p>
                      </div>
                      {error && <p className="text-xs text-red-500">{error}</p>}
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3 bg-[#1B4332] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submitting ? '접수 중...' : '문의 접수'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* 내 문의 내역 탭 */}
              {view === 'list' && (
                <div className="p-4 flex flex-col gap-3">
                  {loadingList ? (
                    <p className="text-sm text-zinc-400 text-center py-8">불러오는 중...</p>
                  ) : inquiries.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">문의 내역이 없어요</p>
                  ) : (
                    inquiries.map(inq => (
                      <div key={inq.id} className="border border-zinc-100 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            inq.type === 'bug'
                              ? 'bg-red-50 text-red-500'
                              : 'bg-blue-50 text-blue-500'
                          }`}>
                            {TYPE_LABELS[inq.type]}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            inq.admin_reply
                              ? 'bg-[#1B4332]/10 text-[#1B4332]'
                              : 'bg-zinc-100 text-zinc-400'
                          }`}>
                            {inq.admin_reply ? '답변 완료' : '답변 대기'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-800">{inq.title}</p>
                        <p className="text-xs text-zinc-500 whitespace-pre-line">{inq.content}</p>
                        {inq.admin_reply && (
                          <div className="bg-[#1B4332]/5 border border-[#1B4332]/10 rounded-lg p-3 mt-1">
                            <p className="text-[10px] font-semibold text-[#1B4332] mb-1">관리자 답변</p>
                            <p className="text-xs text-zinc-700 whitespace-pre-line">{inq.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
