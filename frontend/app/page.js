'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBoards, createBoard } from '@/lib/api';
import { Plus, X, Layout, Loader2 } from 'lucide-react';

const BG_COLORS = [
  '#0079BF', '#D29034', '#519839', '#B04632', '#89609E',
  '#CD5A91', '#4bbf6b', '#00AECC', '#838C91', '#172b4d',
];

export default function HomePage() {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(BG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      setLoading(true);
      const data = await getBoards();
      setBoards(data);
    } catch (err) {
      setError('Failed to load boards. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard({ title: newTitle.trim(), background_color: newColor });
      setBoards(prev => [board, ...prev]);
      setNewTitle('');
      setShowCreate(false);
      router.push(`/board/${board.id}`);
    } catch (err) {
      setError('Failed to create board');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Header */}
      <header className="app-header" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #0079bf, #61bd4f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Layout size={18} color="white" />
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>
              TaskFlow
            </span>
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #61BD4F, #00C2E0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
        }}>
          AJ
        </div>
      </header>

      <main style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: '-1px' }}>
            Your Boards
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16 }}>
            Organize your work, collaborate with your team, and ship faster.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(235,90,70,0.15)', border: '1px solid rgba(235,90,70,0.4)',
            borderRadius: 10, padding: '12px 16px', color: '#ff8f80',
            marginBottom: 24, fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Boards Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={20} className="animate-spin" />
              Loading boards...
            </div>
          ) : (
            <>
              {boards.map(board => (
                <div
                  key={board.id}
                  className="board-card"
                  style={{ background: board.background_color, width: 196, height: 100 }}
                  onClick={() => router.push(`/board/${board.id}`)}
                >
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.3, position: 'relative', zIndex: 1 }}>
                    {board.title}
                  </span>
                </div>
              ))}

              {/* Create Board Button */}
              {showCreate ? (
                <div style={{
                  width: 196, background: 'rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: 12, border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  <input
                    autoFocus
                    className="tf-input"
                    style={{ marginBottom: 8, fontSize: 13 }}
                    placeholder="Board title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(e); if (e.key === 'Escape') setShowCreate(false); }}
                    maxLength={100}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {BG_COLORS.map(c => (
                      <div
                        key={c}
                        onClick={() => setNewColor(c)}
                        style={{
                          width: 20, height: 20, borderRadius: 4, background: c,
                          cursor: 'pointer', border: newColor === c ? '2px solid white' : '2px solid transparent',
                          transition: 'transform 0.1s'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={handleCreate} disabled={creating}>
                      {creating ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
                    </button>
                    <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="board-card"
                  style={{ width: 196, height: 100, background: 'rgba(255,255,255,0.12)', border: '2px dashed rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setShowCreate(true)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1 }}>
                    <Plus size={22} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Create new board</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
