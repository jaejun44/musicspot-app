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
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-[48px] mb-4">🎶</span>
            <p
              className="text-[16px] font-bold text-[#0A0A0A]/40 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              NO PROJECTS YET
            </p>
            <p
              className="text-[13px] text-[#0A0A0A]/30 mt-2 text-center"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              ➕ 버튼을 눌러 첫 번째 프로젝트를 시작해보세요!
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-40">
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
