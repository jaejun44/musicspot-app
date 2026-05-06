'use client';

import { motion } from 'framer-motion';
import { StemProject } from './StemsClient';

const KEY_COLORS: Record<string, string> = {
  C: '#FF3D77', D: '#4FC3F7', E: '#41C66B', F: '#F5FF4F',
  G: '#FF3D77', A: '#4FC3F7', B: '#41C66B',
};

interface Props {
  project: StemProject;
  index: number;
  onOpen: (p: StemProject) => void;
}

export default function ProjectCard({ project, index, onOpen }: Props) {
  const rotate = index % 3 === 0 ? -1.5 : index % 3 === 1 ? 0 : 1.5;
  const keyColor = KEY_COLORS[project.key_signature[0]] ?? '#F5FF4F';

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
        <span
          className={[
            'flex-shrink-0 px-2 py-0.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold',
            project.is_open ? 'bg-[#41C66B] text-white' : 'bg-[#0A0A0A]/10 text-[#0A0A0A]/50',
          ].join(' ')}
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {project.is_open ? '🎵 참여중' : '🔒 마감'}
        </span>
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
