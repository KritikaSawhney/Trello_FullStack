'use client';

import { useState, useRef, useEffect } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem';
import { MoreHorizontal, Plus, X, Trash2, Pencil } from 'lucide-react';

export default function ListColumn({ list, index, visibleCardIds, isFiltering, onAddCard, onDeleteList, onRenameList, onCardClick, onDeleteCard }) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleAddCard() {
    if (!newCardTitle.trim()) return;
    await onAddCard(list.id, newCardTitle.trim());
    setNewCardTitle('');
    setAddingCard(false);
  }

  async function handleRenameBlur() {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== list.title) {
      await onRenameList(list.id, titleValue.trim());
    } else {
      setTitleValue(list.title);
    }
  }

  const visibleCards = isFiltering
    ? (list.cards || []).filter(c => visibleCardIds?.has(c.id))
    : (list.cards || []);

  const totalCards = list.cards?.length || 0;

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="list-column"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.9 : 1,
          }}
        >
          {/* List Header */}
          <div
            {...provided.dragHandleProps}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px 8px', cursor: 'grab', userSelect: 'none',
            }}
          >
            {editingTitle ? (
              <input
                autoFocus
                className="tf-input"
                style={{ fontWeight: 700, fontSize: 14, padding: '4px 8px' }}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleRenameBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameBlur(); if (e.key === 'Escape') { setTitleValue(list.title); setEditingTitle(false); } }}
                maxLength={100}
              />
            ) : (
              <h3
                onClick={() => setEditingTitle(true)}
                style={{
                  fontWeight: 700, fontSize: 14, color: '#172b4d',
                  flex: 1, cursor: 'text', padding: '2px 4px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                title="Click to rename"
              >
                {list.title}
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#5e6c84',
                  background: 'rgba(9,30,66,0.09)', borderRadius: 10,
                  padding: '1px 6px', minWidth: 20, textAlign: 'center'
                }}>
                  {isFiltering ? `${visibleCards.length}/${totalCards}` : totalCards}
                </span>
              </h3>
            )}

            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                className="btn-ghost"
                style={{ padding: '4px 6px', color: '#5e6c84' }}
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 20,
                  background: 'white', borderRadius: 10, padding: '8px 0',
                  boxShadow: '0 8px 24px rgba(9,30,66,0.25)', minWidth: 180
                }}>
                  <button
                    onClick={() => { setEditingTitle(true); setShowMenu(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#172b4d', display: 'flex', alignItems: 'center', gap: 8
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f4f5f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Pencil size={14} /> Rename list
                  </button>
                  <div style={{ borderTop: '1px solid #ebecf0', margin: '4px 0' }} />
                  <button
                    onClick={() => { onDeleteList(list.id); setShowMenu(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#eb5a46', display: 'flex', alignItems: 'center', gap: 8
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(235,90,70,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Trash2 size={14} /> Delete list
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <Droppable droppableId={list.id} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  padding: '0 8px',
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 24,
                  background: snapshot.isDraggingOver ? 'rgba(0,121,191,0.07)' : 'transparent',
                  borderRadius: 8,
                  transition: 'background 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {(isFiltering ? list.cards || [] : list.cards || []).map((card, idx) => {
                  if (isFiltering && !visibleCardIds?.has(card.id)) return null;
                  return (
                    <CardItem
                      key={card.id}
                      card={card}
                      index={idx}
                      isFiltering={isFiltering}
                      isVisible={visibleCardIds ? visibleCardIds.has(card.id) : true}
                      onCardClick={onCardClick}
                      onDeleteCard={(cid) => onDeleteCard(cid, list.id)}
                    />
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add Card */}
          <div style={{ padding: '8px 8px 8px' }}>
            {addingCard ? (
              <div>
                <textarea
                  autoFocus
                  className="tf-textarea"
                  style={{ minHeight: 60, fontSize: 13, marginBottom: 8 }}
                  placeholder="Enter a title for this card..."
                  value={newCardTitle}
                  onChange={e => setNewCardTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                    if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
                  }}
                  maxLength={500}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ fontSize: 13 }} onClick={handleAddCard}>Add card</button>
                  <button className="btn-ghost" onClick={() => { setAddingCard(false); setNewCardTitle(''); }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button className="add-card-btn" onClick={() => setAddingCard(true)}>
                <Plus size={16} /> Add a card
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
