'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { StemProject } from './StemsClient';

const KEY_COLORS: Record<string, string> = {
  C: '#FF3D77', D: '#4FC3F7', E: '#41C66B', F: '#F5FF4F',
  G: '#FF3D77', A: '#4FC3F7', B: '#41C66B',
};

interface Props {
  project: StemProject;
  index: number;
  user: User | null;
  onOpen: (p: StemProject) => void;
  onEdit: (p: StemProject) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, index, user, onOpen, onEdit, onDelete }: Props) {
  const rotate = index % 3 === 0 ? -1.5 : index % 3 === 1 ? 0 : 1.5;
  const keyColor = KEY_COLORS[project.key_signature[0]] ?? '#F5FF4F';
  const isOwner = !!user && user.id === project.creator_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, boxShadow: '8px 8px 0 #0A0A0A' }}
      style={{ rotate, boxShadow: '5px 5px 0 #0A0A0A' }}
      onClick={() => onOpen(project)}
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 cursor-pointer"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[18px]">{project.creator_emoji}</span>
            <p
              className="text-[11px] text-[#0A0A0A]/50 font-bold"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {project.creator_name}
            </p>
          </div>
          <h3
            className="text-[16px] font-bold text-[#0A0A0A] leading-tight"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {project.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={[
              'px-2 py-0.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold',
              project.is_open ? 'bg-[#41C66B] text-white' : 'bg-[#0A0A0A]/10 text-[#0A0A0A]/50',
            ].join(' ')}
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {project.is_open ? '🎵 참여중' : '🔒 마감'}
          </span>

          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="w-7 h-7 flex items-center justify-center rounded-[8px] border-[2px] border-[#0A0A0A]/20 hover:bg-[#0A0A0A]/5 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5 text-[#0A0A0A]/50" />
              </button>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-[calc(100%+4px)] bg-white rounded-[12px] border-[2px] border-[#0A0A0A] overflow-hidden z-10"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A', minWidth: '100px' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(project); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-[#0A0A0A] hover:bg-[#FFF8F0] transition-colors border-b border-[#0A0A0A]/10"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(project.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-[#FF3D77] hover:bg-[#FF3D77]/10 transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    🗑️ 삭제
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 메타 뱃지 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          ♩ {project.bpm} BPM
        </span>
        <span
          className="px-2 py-0.5 text-[#0A0A0A] text-[11px] font-bold rounded-[6px] border-[2px] border-[#0A0A0A]"
          style={{
            backgroundColor: keyColor + '33',
            fontFamily: 'Pretendard, sans-serif',
          }}
        >
          🎼 {project.key_signature}
        </span>
        {project.genre && (
          <span
            className="px-2 py-0.5 bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 text-[#0A0A0A]/60 text-[11px] font-bold rounded-[6px]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {project.genre}
          </span>
        )}
      </div>

      {/* 설명 */}
      {project.description && (
        <p
          className="text-[12px] text-[#0A0A0A]/60 font-bold leading-relaxed mb-3 line-clamp-2"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {project.description}
        </p>
      )}

      {/* 하단 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">🎧</span>
          <span
            className="text-[12px] font-bold text-[#0A0A0A]/60"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            트랙 {project.track_count ?? 0}개
          </span>
        </div>
        <span
          className="text-[11px] text-[#0A0A0A]/30 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {project.created_at.slice(0, 10)}
        </span>
      </div>
    </motion.div>
  );
}
