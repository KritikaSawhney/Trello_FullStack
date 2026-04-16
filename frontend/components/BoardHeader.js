'use client';

import { useState } from 'react';
import { updateBoard } from '@/lib/api';
import { ChevronLeft, Layout, Pencil, Check } from 'lucide-react';

export default function BoardHeader({ board, onBoardUpdate, onBack }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(board.title);

  async function saveTitle() {
    setEditingTitle(false);
    if (!titleValue.trim() || titleValue === board.title) return;
    const updated = await updateBoard(board.id, { title: titleValue.trim() });
    onBoardUpdate(updated);
  }

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(8px)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'rgba(255,255,255,0.18)', border: 'none',
          borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
          color: 'white', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 500, transition: 'background 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
      >
        <ChevronLeft size={16} /> Boards
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.4)' }} />

      {/* Board title */}
      {editingTitle ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            autoFocus
            style={{
              background: 'rgba(255,255,255,0.95)', border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 17,
              color: '#172b4d', outline: 'none'
            }}
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(board.title); } }}
            maxLength={100}
          />
          <button onClick={saveTitle} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer', color: 'white' }}>
            <Check size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingTitle(true)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'white', fontWeight: 700, fontSize: 17, padding: '4px 8px',
            borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {board.title}
          <Pencil size={13} style={{ opacity: 0.7 }} />
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Current user */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 10px'
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #61BD4F, #00C2E0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 11
        }}>AJ</div>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Alice Johnson</span>
      </div>
    </div>
  );
}
