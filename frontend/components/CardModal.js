'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCard, updateCard, deleteCard,
  addLabelToCard, removeLabelFromCard,
  addMemberToCard, removeMemberFromCard,
  addChecklist, deleteChecklist,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  addComment, deleteComment,
  uploadAttachment, deleteAttachment, uploadCover
} from '@/lib/api';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import {
  X, Tag, Calendar, CheckSquare, User, MessageSquare,
  Plus, Trash2, Check, Pencil, Loader2, AlignLeft, Clock,
  Paperclip, Image as ImageIcon, Download
} from 'lucide-react';

const CURRENT_MEMBER_ID = '11111111-1111-1111-1111-111111111111'; // Alice (default user)

export default function CardModal({ cardId, boardId, boardLabels, allMembers, onClose, onUpdate, onDelete }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activePanel, setActivePanel] = useState(null); // 'labels' | 'members' | 'dates' | 'checklist'
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({});
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const loadCard = useCallback(async () => {
    try {
      const data = await getCard(cardId);
      setCard(data);
      setTitleValue(data.title);
      setDescValue(data.description || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function saveTitle() {
    if (!titleValue.trim() || titleValue === card.title) { setEditingTitle(false); return; }
    setSaving(true);
    const updated = await updateCard(card.id, { title: titleValue.trim(), description: card.description, due_date: card.due_date });
    setCard(updated);
    onUpdate(updated);
    setEditingTitle(false);
    setSaving(false);
  }

  async function saveDesc() {
    setSaving(true);
    const updated = await updateCard(card.id, { title: card.title, description: descValue, due_date: card.due_date });
    setCard(updated);
    onUpdate(updated);
    setEditingDesc(false);
    setSaving(false);
  }

  async function saveDueDate(dateStr) {
    const updated = await updateCard(card.id, { title: card.title, description: card.description, due_date: dateStr || null });
    setCard(updated);
    onUpdate(updated);
  }

  async function toggleLabel(label) {
    const has = card.labels?.some(l => l.id === label.id);
    let updated;
    if (has) {
      updated = await removeLabelFromCard(card.id, label.id);
    } else {
      updated = await addLabelToCard(card.id, label.id);
    }
    setCard(updated);
    onUpdate(updated);
  }

  async function toggleMember(member) {
    const has = card.members?.some(m => m.id === member.id);
    let updated;
    if (has) {
      updated = await removeMemberFromCard(card.id, member.id);
    } else {
      updated = await addMemberToCard(card.id, member.id);
    }
    setCard(updated);
    onUpdate(updated);
  }

  async function handleAddChecklist() {
    if (!newChecklistTitle.trim()) return;
    const cl = await addChecklist(card.id, newChecklistTitle.trim());
    setCard(prev => ({ ...prev, checklists: [...(prev.checklists || []), cl] }));
    setNewChecklistTitle('');
    setActivePanel(null);
    onUpdate({ ...card, checklists: [...(card.checklists || []), cl] });
  }

  async function handleAddItem(checklistId) {
    const text = newItemTexts[checklistId];
    if (!text?.trim()) return;
    const item = await addChecklistItem(card.id, checklistId, text.trim());
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId ? { ...cl, items: [...cl.items, item] } : cl
      ),
    }));
    setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }));
  }

  async function toggleItem(checklistId, item) {
    const updated = await updateChecklistItem(card.id, checklistId, item.id, { is_complete: !item.is_complete });
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId ? { ...cl, items: cl.items.map(i => i.id === item.id ? updated : i) } : cl
      ),
    }));
  }

  async function handleDeleteItem(checklistId, itemId) {
    await deleteChecklistItem(card.id, checklistId, itemId);
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId ? { ...cl, items: cl.items.filter(i => i.id !== itemId) } : cl
      ),
    }));
  }

  async function handleDeleteChecklist(checklistId) {
    await deleteChecklist(card.id, checklistId);
    setCard(prev => ({ ...prev, checklists: prev.checklists.filter(cl => cl.id !== checklistId) }));
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    const comment = await addComment(card.id, CURRENT_MEMBER_ID, newComment.trim());
    setCard(prev => ({ ...prev, comments: [comment, ...(prev.comments || [])] }));
    setNewComment('');
  }

  async function handleDeleteComment(commentId) {
    await deleteComment(card.id, commentId);
    setCard(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
  }

  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const updated = await uploadAttachment(card.id, file);
      setCard(updated);
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    const updated = await deleteAttachment(card.id, attachmentId);
    setCard(updated);
    onUpdate(updated);
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const updated = await uploadCover(card.id, file);
      setCard(updated);
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingCover(false);
    }
  }

  if (loading || !card) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#0079bf' }} />
        </div>
      </div>
    );
  }

  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate);
  const isDueSoon = dueDate && !isOverdue && isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 2) });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        {/* Cover */}
        {card.cover_image_url ? (
          <div style={{
            height: 160,
            backgroundImage: `url(${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}${card.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px 16px 0 0'
          }} />
        ) : card.cover_color ? (
          <div style={{ height: 128, background: card.cover_color, borderRadius: '16px 16px 0 0' }} />
        ) : null}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(9,30,66,0.1)', border: 'none', borderRadius: '50%',
            width: 34, height: 34, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#5e6c84',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(9,30,66,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(9,30,66,0.1)'}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', gap: 16, padding: '20px 20px 24px' }}>
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              {editingTitle ? (
                <div>
                  <textarea
                    autoFocus
                    className="tf-textarea"
                    style={{ fontSize: 20, fontWeight: 700, minHeight: 60 }}
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') setEditingTitle(false); }}
                  />
                </div>
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  style={{
                    fontSize: 20, fontWeight: 700, color: '#172b4d',
                    cursor: 'text', padding: '4px 8px', borderRadius: 6,
                    lineHeight: 1.3, marginLeft: -8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(9,30,66,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Click to edit"
                >
                  {card.title}
                </h2>
              )}
            </div>

            {/* Labels row */}
            {card.labels?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="modal-section-title">Labels</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {card.labels.map(label => (
                    <span
                      key={label.id}
                      className="label-pill-lg"
                      style={{ background: label.color }}
                      onClick={() => toggleLabel(label)}
                      title="Click to remove"
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Members row */}
            {card.members?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="modal-section-title">Members</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {card.members.map(member => (
                    <div
                      key={member.id}
                      className="member-avatar member-avatar-lg"
                      style={{ background: member.avatar_color }}
                      title={`${member.name} — click to remove`}
                      onClick={() => toggleMember(member)}
                    >
                      {member.initials}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Due Date */}
            {dueDate && (
              <div style={{ marginBottom: 16 }}>
                <p className="modal-section-title">Due Date</p>
                <span className={`due-badge ${isOverdue ? 'due-overdue' : isDueSoon ? 'due-soon' : 'due-ok'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                  <Clock size={13} />
                  {format(dueDate, 'MMM d, yyyy')}
                  {isOverdue && ' — Overdue'}
                  {isDueSoon && ' — Due soon'}
                </span>
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlignLeft size={16} style={{ color: '#5e6c84' }} />
                <p className="modal-section-title" style={{ margin: 0 }}>Description</p>
              </div>
              {editingDesc ? (
                <div>
                  <textarea
                    autoFocus
                    className="tf-textarea"
                    style={{ minHeight: 100, marginBottom: 8 }}
                    value={descValue}
                    placeholder="Add a more detailed description..."
                    onChange={e => setDescValue(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ fontSize: 13 }} onClick={saveDesc}>Save</button>
                    <button className="btn-ghost" onClick={() => { setEditingDesc(false); setDescValue(card.description || ''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  style={{
                    background: card.description ? 'transparent' : '#f4f5f7',
                    borderRadius: 8, padding: '10px 12px', cursor: 'text',
                    minHeight: 56, fontSize: 14, color: card.description ? '#172b4d' : '#97a0af',
                    lineHeight: 1.6, border: '1px solid transparent',
                    transition: 'border 0.15s, background 0.15s',
                    whiteSpace: 'pre-wrap'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(9,30,66,0.06)'; e.currentTarget.style.border = '1px solid #dfe1e6'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = card.description ? 'transparent' : '#f4f5f7'; e.currentTarget.style.border = '1px solid transparent'; }}
                >
                  {card.description || 'Click to add a description...'}
                </div>
              )}
            </div>

            {/* Checklists */}
            {(card.checklists || []).map(checklist => {
              const total = checklist.items.length;
              const done = checklist.items.filter(i => i.is_complete).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={checklist.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CheckSquare size={16} style={{ color: '#5e6c84' }} />
                    <p className="modal-section-title" style={{ margin: 0, flex: 1 }}>{checklist.title}</p>
                    <span style={{ fontSize: 12, color: '#5e6c84', fontWeight: 600 }}>{pct}%</span>
                    <button
                      onClick={() => handleDeleteChecklist(checklist.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#97a0af', padding: '2px 6px', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#eb5a46'}
                      onMouseLeave={e => e.currentTarget.style.color = '#97a0af'}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="checklist-bar-bg" style={{ marginBottom: 12 }}>
                    <div className={`checklist-bar-fill ${pct === 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
                  </div>

                  {/* Items */}
                  {checklist.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderRadius: 6 }}>
                      <button
                        onClick={() => toggleItem(checklist.id, item)}
                        style={{
                          width: 18, height: 18, borderRadius: 4, border: '2px solid #b3bac5',
                          background: item.is_complete ? '#61bd4f' : 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.15s, border 0.15s',
                          borderColor: item.is_complete ? '#61bd4f' : '#b3bac5'
                        }}
                      >
                        {item.is_complete && <Check size={11} color="white" strokeWidth={3} />}
                      </button>
                      <span style={{
                        flex: 1, fontSize: 14, color: item.is_complete ? '#97a0af' : '#172b4d',
                        textDecoration: item.is_complete ? 'line-through' : 'none'
                      }}>
                        {item.title}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(checklist.id, item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#97a0af', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#eb5a46'}
                        onMouseLeave={e => e.currentTarget.style.color = '#97a0af'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add item */}
                  <div style={{ marginTop: 8, paddingLeft: 28 }}>
                    <input
                      className="tf-input"
                      style={{ marginBottom: 6, fontSize: 13 }}
                      placeholder="Add an item..."
                      value={newItemTexts[checklist.id] || ''}
                      onChange={e => setNewItemTexts(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(checklist.id); }}
                    />
                    {newItemTexts[checklist.id] && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => handleAddItem(checklist.id)}>
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Checklist inline */}
            {activePanel === 'checklist' && (
              <div style={{ background: '#f4f5f7', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#172b4d' }}>Add Checklist</p>
                <input
                  autoFocus
                  className="tf-input"
                  style={{ marginBottom: 8, fontSize: 13 }}
                  placeholder="Checklist title..."
                  value={newChecklistTitle}
                  onChange={e => setNewChecklistTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChecklist(); if (e.key === 'Escape') setActivePanel(null); }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={handleAddChecklist}>Add</button>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setActivePanel(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {(card.attachments?.length > 0) && (
              <div style={{ marginBottom: 24, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Paperclip size={16} style={{ color: '#5e6c84' }} />
                  <p className="modal-section-title" style={{ margin: 0 }}>Attachments</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {card.attachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f4f5f7', padding: '8px 12px', borderRadius: 8 }}>
                      <div style={{ width: 40, height: 40, background: '#dfe1e6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5e6c84', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{att.file_url.split('.').pop().toUpperCase().slice(0, 4)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#172b4d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {att.file_name}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#5e6c84', marginTop: 2 }}>
                          {format(new Date(att.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}${att.file_url}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '4px 8px' }} title="Download">
                          <Download size={14} />
                        </a>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#eb5a46' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MessageSquare size={16} style={{ color: '#5e6c84' }} />
                <p className="modal-section-title" style={{ margin: 0 }}>Activity</p>
              </div>

              {/* Comment input */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="member-avatar" style={{ background: '#61BD4F', width: 32, height: 32, flexShrink: 0, fontSize: 11 }}>
                  AJ
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="tf-input"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                    style={{ marginBottom: newComment ? 8 : 0 }}
                  />
                  {newComment && (
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleAddComment}>Save</button>
                  )}
                </div>
              </div>

              {/* Comment list */}
              {(card.comments || []).map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div className="member-avatar" style={{ background: comment.member_avatar_color || '#0079bf', width: 32, height: 32, flexShrink: 0, fontSize: 11 }}>
                    {comment.member_initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#172b4d' }}>{comment.member_name}</span>
                      <span style={{ fontSize: 12, color: '#97a0af' }}>{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#172b4d', boxShadow: '0 1px 2px rgba(9,30,66,0.1)' }}>
                      {comment.content}
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#97a0af', fontSize: 12, marginTop: 4, padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#eb5a46'}
                      onMouseLeave={e => e.currentTarget.style.color = '#97a0af'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 172, flexShrink: 0 }}>
            <p className="modal-section-title" style={{ marginBottom: 8 }}>Add to card</p>

            {/* Labels Panel */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8 }}
                onClick={() => setActivePanel(activePanel === 'labels' ? null : 'labels')}
              >
                <Tag size={15} /> Labels
              </button>
              {activePanel === 'labels' && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 30, marginTop: 4,
                  background: 'white', borderRadius: 10, padding: '12px',
                  boxShadow: '0 8px 24px rgba(9,30,66,0.2)', width: 220
                }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#172b4d' }}>Labels</p>
                  {boardLabels.map(label => {
                    const has = card.labels?.some(l => l.id === label.id);
                    return (
                      <div
                        key={label.id}
                        onClick={() => toggleLabel(label)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                          borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                          background: has ? 'rgba(0,121,191,0.08)' : 'transparent',
                          transition: 'background 0.12s'
                        }}
                        onMouseEnter={e => { if (!has) e.currentTarget.style.background = '#f4f5f7'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = has ? 'rgba(0,121,191,0.08)' : 'transparent'; }}
                      >
                        <div style={{ width: 36, height: 20, borderRadius: 4, background: label.color }} />
                        <span style={{ fontSize: 13, flex: 1, color: '#172b4d' }}>{label.name}</span>
                        {has && <Check size={14} style={{ color: '#0079bf' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Members Panel */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8 }}
                onClick={() => setActivePanel(activePanel === 'members' ? null : 'members')}
              >
                <User size={15} /> Members
              </button>
              {activePanel === 'members' && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 30, marginTop: 4,
                  background: 'white', borderRadius: 10, padding: '12px',
                  boxShadow: '0 8px 24px rgba(9,30,66,0.2)', width: 220
                }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#172b4d' }}>Members</p>
                  {allMembers.map(member => {
                    const has = card.members?.some(m => m.id === member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleMember(member)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                          borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                          background: has ? 'rgba(0,121,191,0.08)' : 'transparent'
                        }}
                        onMouseEnter={e => { if (!has) e.currentTarget.style.background = '#f4f5f7'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = has ? 'rgba(0,121,191,0.08)' : 'transparent'; }}
                      >
                        <div className="member-avatar" style={{ background: member.avatar_color, width: 30, height: 30, fontSize: 11 }}>
                          {member.initials}
                        </div>
                        <span style={{ fontSize: 13, flex: 1, color: '#172b4d' }}>{member.name}</span>
                        {has && <Check size={14} style={{ color: '#0079bf' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div style={{ marginBottom: 6 }}>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8 }}
                onClick={() => setActivePanel(activePanel === 'dates' ? null : 'dates')}
              >
                <Calendar size={15} /> Dates
              </button>
              {activePanel === 'dates' && (
                <div style={{ marginTop: 6, padding: '10px 12px', background: '#f4f5f7', borderRadius: 8 }}>
                  <label style={{ fontSize: 12, color: '#5e6c84', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Due date
                  </label>
                  <input
                    type="date"
                    className="tf-input"
                    style={{ fontSize: 13 }}
                    value={card.due_date ? format(new Date(card.due_date), 'yyyy-MM-dd') : ''}
                    onChange={e => saveDueDate(e.target.value ? new Date(e.target.value).toISOString() : null)}
                  />
                  {card.due_date && (
                    <button
                      className="btn-ghost"
                      style={{ marginTop: 6, color: '#eb5a46', width: '100%', fontSize: 12, justifyContent: 'center' }}
                      onClick={() => saveDueDate(null)}
                    >
                      Remove date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 6 }}>
              <button
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8 }}
                onClick={() => setActivePanel(activePanel === 'checklist' ? null : 'checklist')}
              >
                <CheckSquare size={15} /> Checklist
              </button>
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: 6 }}>
              <label
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8, cursor: uploadingAttachment ? 'wait' : 'pointer' }}
              >
                {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                {uploadingAttachment ? 'Uploading...' : 'Attachment'}
                <input type="file" style={{ display: 'none' }} onChange={handleAttachmentUpload} disabled={uploadingAttachment} />
              </label>
            </div>

            {/* Cover */}
            <div style={{ marginBottom: 6 }}>
              <label
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#172b4d', padding: '8px 12px', background: '#f4f5f7', borderRadius: 8, cursor: uploadingCover ? 'wait' : 'pointer' }}
              >
                {uploadingCover ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                {uploadingCover ? 'Uploading...' : 'Cover Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} disabled={uploadingCover} />
              </label>
            </div>

            {/* Danger zone */}
            <div style={{ marginTop: 20 }}>
              <p className="modal-section-title" style={{ marginBottom: 8 }}>Actions</p>
              <button
                onClick={() => { onDelete(card.id); onClose(); }}
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 8, fontSize: 13, color: '#eb5a46', padding: '8px 12px', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(235,90,70,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={15} /> Delete card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
