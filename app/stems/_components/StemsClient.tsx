'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import ProjectDetailModal from './ProjectDetailModal';

export interface StemProject {
  id: string;
  title: string;
  creator_id: string | null;
  creator_name: string;
  creator_emoji: string;
  bpm: number;
  key_signature: string;
  genre: string | null;
  description: string | null;
  is_open: boolean;
  created_at: string;
  track_count?: number;
}

export default function StemsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<StemProject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<StemProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<StemProject | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const { data } = await supabase
      .from('stem_projects')
      .select('*, stem_tracks(count)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const mapped = data.map((p: unknown) => {
        const row = p as Record<string, unknown>;
        return {
          ...(row as unknown as StemProject),
          track_count: (row.stem_tracks as Array<{ count: number }>)?.[0]?.count ?? 0,
        };
      });
      setProjects(mapped);
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('프로젝트를 삭제하시겠어요? 모든 트랙도 함께 삭제됩니다.')) return;
    await supabase.from('stem_tracks').delete().eq('project_id', id);
    await supabase.from('stem_projects').delete().eq('id', id);
    fetchProjects();
  }

  function handleEditProject(project: StemProject) {
    setEditingProject(project);
  }

  function closeModal() {
    setShowCreate(false);
    setEditingProject(null);
  }

  const steps = [
    { icon: '🎸', text: '8마디 녹음 또는 텍스트로 던지기' },
    { icon: '🎯', text: '어울리는 뮤지션에게 챌린지 전송' },
    { icon: '🔥', text: '답마디 받으면 밴드가 만들어진다' },
  ];

  function openCreate() {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    setShowCreate(true);
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 헤더 */}
      <div className="px-4 pt-6 pb-3 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            PASS THE RIFF 🎸
          </h1>
          <p
            className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            릴레이로 완성하는 우리의 리프
          </p>
        </motion.div>
      </div>

      {/* 3단계 안내 */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          className="rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #0A0A0A', background: '#0A0A0A' }}
        >
          <p
            className="px-5 pt-4 pb-3 text-[#F5FF4F] text-[16px]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            이렇게 해봐 ⚡
          </p>
          <div className="flex flex-col divide-y divide-white/10">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="text-[20px] shrink-0">{step.icon}</span>
                <p
                  className="text-white text-[14px] font-bold"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  <span className="text-[#F5FF4F] mr-1">0{i + 1}</span>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 pt-3">
            <motion.button
              whileHover={{ y: 3, boxShadow: '3px 3px 0 #F5FF4F' }}
              whileTap={{ scale: 0.96 }}
              onClick={openCreate}
              className="w-full py-4 bg-[#F5FF4F] text-[#0A0A0A] rounded-[14px] border-[3px] border-[#F5FF4F] text-[16px] font-bold"
              style={{
                fontFamily: 'Bungee, sans-serif',
                boxShadow: '5px 5px 0 #F5FF4F55',
              }}
            >
              첫 챌린지 시작하기 ⚡
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* 카운트 */}
      <div className="px-4 pb-3 max-w-2xl mx-auto">
        <motion.p
          key={projects.length}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[12px] text-[#0A0A0A]/40 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {projects.length}개의 프로젝트
        </motion.p>
      </div>

      {/* 프로젝트 목록 */}
      <div className="px-4 pb-28 max-w-2xl mx-auto">
        {projects.length > 0 ? (
          <div className="flex flex-col gap-4">
            {projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                user={user}
                onOpen={setSelectedProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="text-[48px]">🎸</span>
            <p
              className="text-[15px] font-bold text-[#0A0A0A]/60 text-center"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              아직 챌린지가 없어요.
              <br />첫 번째 8마디를 던져보세요!
            </p>
            <motion.button
              whileHover={{ y: 3, boxShadow: '3px 3px 0 #0A0A0A' }}
              whileTap={{ scale: 0.96 }}
              onClick={openCreate}
              className="px-6 py-3 bg-[#FF3D77] text-white rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold"
              style={{ fontFamily: 'Bungee, sans-serif', boxShadow: '5px 5px 0 #0A0A0A' }}
            >
              챌린지 시작하기 🎸
            </motion.button>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-40" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.07, rotate: 5 }}
          whileTap={{ scale: 0.92, y: 2 }}
          onClick={() => {
            if (loading) return;
            if (!user) { router.push('/login'); return; }
            setShowCreate(true);
          }}
          className="w-14 h-14 bg-[#41C66B] rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center text-[24px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          ➕
        </motion.button>
      </div>

      {(showCreate || editingProject) && user && (
        <CreateProjectModal
          user={user}
          editProject={editingProject ?? undefined}
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
            fetchProjects();
          }}
        />
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          user={user}
          onClose={() => setSelectedProject(null)}
          onUpdate={fetchProjects}
          onEdit={(p) => { setSelectedProject(null); handleEditProject(p); }}
          onDelete={async (id) => {
            await supabase.from('stem_tracks').delete().eq('project_id', id);
            await supabase.from('stem_projects').delete().eq('id', id);
            setSelectedProject(null);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
