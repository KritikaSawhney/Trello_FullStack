'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { Calendar, CheckSquare, User, Pencil, Trash2, Paperclip } from 'lucide-react';

export default function CardItem({ card, index, onCardClick, onDeleteCard, isFiltering, isVisible }) {
  const [showActions, setShowActions] = useState(false);

  if (isFiltering && !isVisible) {
    return null;
  }

  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate);
  const isDueSoon = dueDate && !isOverdue && isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 2) });

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="kanban-card"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.95 : 1,
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
              : provided.draggableProps.style?.transform,
          }}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          onClick={() => onCardClick(card)}
        >
          {/* Cover image or color strip */}
          {card.cover_image_url ? (
            <div 
              style={{
                height: 120,
                backgroundImage: `url(${process.env.NEXT_PUBLIC_API_URL.replace('/api', '')}${card.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6
              }}
            />
          ) : card.cover_color ? (
            <div className="card-cover" style={{ background: card.cover_color }} />
          ) : null}

          <div style={{ padding: '10px 12px 10px' }}>
            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {card.labels.map(label => (
                  <span
                    key={label.id}
                    className="label-pill"
                    style={{ background: label.color }}
                    title={label.name}
                  />
                ))}
              </div>
            )}

            {/* Card Title */}
            <p style={{
              fontSize: 14, color: '#172b4d', lineHeight: 1.4,
              fontWeight: 500, marginBottom: 6
            }}>
              {card.title}
            </p>

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Due date */}
              {dueDate && (
                <span
                  className={`due-badge ${isOverdue ? 'due-overdue' : isDueSoon ? 'due-soon' : 'due-ok'}`}
                >
                  <Calendar size={10} />
                  {format(dueDate, 'MMM d')}
                </span>
              )}

              {/* Checklist progress */}
              {card.checklist_total > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 600, color: card.checklist_complete === card.checklist_total ? '#61bd4f' : '#5e6c84',
                  background: card.checklist_complete === card.checklist_total ? 'rgba(97,189,79,0.12)' : '#ebecf0',
                  padding: '2px 6px', borderRadius: 4
                }}>
                  <CheckSquare size={10} />
                  {card.checklist_complete}/{card.checklist_total}
                </span>
              )}

              {/* Attachments */}
              {card.attachment_count > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 600, color: '#5e6c84',
                  background: '#ebecf0', padding: '2px 6px', borderRadius: 4
                }}>
                  <Paperclip size={10} />
                  {card.attachment_count}
                </span>
              )}
            </div>

            {/* Members row */}
            {card.members && card.members.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: -4 }}>
                {card.members.slice(0, 4).map(member => (
                  <div
                    key={member.id}
                    className="member-avatar"
                    style={{ background: member.avatar_color, marginLeft: -4, fontSize: 10, width: 24, height: 24 }}
                    title={member.name}
                  >
                    {member.initials}
                  </div>
                ))}
                {card.members.length > 4 && (
                  <div className="member-avatar" style={{ background: '#5e6c84', marginLeft: -4, width: 24, height: 24, fontSize: 10 }}>
                    +{card.members.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hover actions */}
          {showActions && (
            <button
              onClick={e => { e.stopPropagation(); onDeleteCard(card.id); }}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: 'rgba(9,30,66,0.1)', border: 'none',
                borderRadius: 6, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#5e6c84', transition: 'background 0.12s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(235,90,70,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(9,30,66,0.1)'}
              title="Delete card"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}
