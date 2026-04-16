'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import {
  getBoard, reorderLists, reorderCards,
  createList, updateList, deleteList,
  createCard, deleteCard, getMembers
} from '@/lib/api';
import ListColumn from '@/components/ListColumn';
import CardModal from '@/components/CardModal';
import BoardHeader from '@/components/BoardHeader';
import SearchFilter from '@/components/SearchFilter';
import { Plus, Loader2 } from 'lucide-react';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const router = useRouter();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [filterState, setFilterState] = useState({ q: '', label_id: '', member_id: '', due_filter: '' });
  const [filteredCardIds, setFilteredCardIds] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await getBoard(boardId);
      setBoard(data);
      setLists(data.lists || []);
    } catch (err) {
      setError('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
    getMembers().then(setAllMembers).catch(console.error);
  }, [loadBoard]);

  // Drag-and-drop handler
  function onDragEnd(result) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'LIST') {
      const newLists = Array.from(lists);
      const [moved] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, moved);
      const updated = newLists.map((l, i) => ({ ...l, position: i }));
      setLists(updated);
      reorderLists(updated.map(l => ({ id: l.id, position: l.position }))).catch(console.error);
      return;
    }

    if (type === 'CARD') {
      const srcListIdx = lists.findIndex(l => l.id === source.droppableId);
      const dstListIdx = lists.findIndex(l => l.id === destination.droppableId);
      if (srcListIdx === -1 || dstListIdx === -1) return;

      const newLists = lists.map(l => ({ ...l, cards: [...(l.cards || [])] }));
      const [movedCard] = newLists[srcListIdx].cards.splice(source.index, 1);
      movedCard.list_id = newLists[dstListIdx].id;
      newLists[dstListIdx].cards.splice(destination.index, 0, movedCard);

      // Re-assign positions
      newLists[srcListIdx].cards = newLists[srcListIdx].cards.map((c, i) => ({ ...c, position: i }));
      newLists[dstListIdx].cards = newLists[dstListIdx].cards.map((c, i) => ({ ...c, position: i }));

      setLists(newLists);

      // Build update payload (all affected cards)
      const updatedCards = [
        ...newLists[srcListIdx].cards.map(c => ({ id: c.id, list_id: c.list_id, position: c.position })),
        ...newLists[dstListIdx].cards.map(c => ({ id: c.id, list_id: c.list_id, position: c.position })),
      ];
      reorderCards(updatedCards).catch(console.error);
    }
  }

  async function handleAddList() {
    if (!newListTitle.trim()) return;
    try {
      const list = await createList({ board_id: boardId, title: newListTitle.trim() });
      setLists(prev => [...prev, { ...list, cards: [] }]);
      setNewListTitle('');
      setAddingList(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteList(listId) {
    try {
      await deleteList(listId);
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRenameList(listId, title) {
    try {
      const updated = await updateList(listId, { title });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, title: updated.title } : l));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddCard(listId, title) {
    try {
      const card = await createCard({ list_id: listId, title });
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: [...(l.cards || []), { ...card, labels: [], members: [], checklist_total: 0, checklist_complete: 0 }] } : l
      ));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteCard(cardId, listId) {
    try {
      await deleteCard(cardId);
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l
      ));
      if (selectedCard?.id === cardId) setSelectedCard(null);
    } catch (err) {
      console.error(err);
    }
  }

  function handleCardUpdate(updatedCard) {
    setLists(prev => prev.map(l => ({
      ...l,
      cards: l.cards.map(c => c.id === updatedCard.id ? {
        ...c,
        title: updatedCard.title,
        description: updatedCard.description,
        due_date: updatedCard.due_date,
        labels: updatedCard.labels,
        members: updatedCard.members,
        checklist_total: updatedCard.checklists?.reduce((sum, cl) => sum + cl.items.length, 0) || 0,
        checklist_complete: updatedCard.checklists?.reduce((sum, cl) => sum + cl.items.filter(i => i.is_complete).length, 0) || 0,
      } : c),
    })));
    setSelectedCard(updatedCard);
  }

  // Compute visible cards based on filters
  const visibleCardIds = searchResults ? new Set(searchResults.map(c => c.id)) : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0079BF' }}>
        <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={40} className="animate-spin" />
          <span style={{ fontSize: 18, fontWeight: 600 }}>Loading board...</span>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0079BF' }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>⚠️ {error || 'Board not found'}</h2>
          <button className="btn-primary" onClick={() => router.push('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-bg" style={{ background: board.background_color, minHeight: '100vh' }}>
      {/* Board Header */}
      <BoardHeader
        board={board}
        onBoardUpdate={(updated) => setBoard(prev => ({ ...prev, ...updated }))}
        onBack={() => router.push('/')}
      />

      {/* Search & Filter bar */}
      <SearchFilter
        boardId={boardId}
        labels={board.labels || []}
        members={allMembers}
        onResults={setSearchResults}
      />

      {/* Board Content */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden', padding: '12px 12px 24px', minHeight: 'calc(100vh - 110px)' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="LIST" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minHeight: 60 }}
              >
                {lists.map((list, index) => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    index={index}
                    visibleCardIds={visibleCardIds}
                    isFiltering={searchResults !== null}
                    onAddCard={handleAddCard}
                    onDeleteList={handleDeleteList}
                    onRenameList={handleRenameList}
                    onCardClick={setSelectedCard}
                    onDeleteCard={handleDeleteCard}
                    boardLabels={board.labels || []}
                  />
                ))}
                {provided.placeholder}

                {/* Add List */}
                <div style={{ minWidth: 272 }}>
                  {addingList ? (
                    <div style={{
                      background: '#ebecf0', borderRadius: 12, padding: 12,
                      boxShadow: '0 1px 2px rgba(9,30,66,.2)'
                    }}>
                      <input
                        autoFocus
                        className="tf-input"
                        style={{ marginBottom: 8 }}
                        placeholder="Enter list title..."
                        value={newListTitle}
                        onChange={e => setNewListTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddList();
                          if (e.key === 'Escape') { setAddingList(false); setNewListTitle(''); }
                        }}
                        maxLength={100}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary" style={{ fontSize: 13 }} onClick={handleAddList}>Add list</button>
                        <button className="btn-ghost" onClick={() => { setAddingList(false); setNewListTitle(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingList(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.22)', border: 'none',
                        borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                        color: 'white', fontWeight: 600, fontSize: 14,
                        width: '100%', transition: 'background 0.15s',
                        backdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                    >
                      <Plus size={16} />
                      Add another list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          cardId={selectedCard.id}
          boardId={boardId}
          boardLabels={board.labels || []}
          allMembers={allMembers}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={(cardId) => {
            const listId = lists.find(l => l.cards?.some(c => c.id === cardId))?.id;
            handleDeleteCard(cardId, listId);
          }}
        />
      )}
    </div>
  );
}
