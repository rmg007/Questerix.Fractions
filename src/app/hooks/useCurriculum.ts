import { useEffect, useState } from 'react';
import { loadCurriculumBundle } from '@/curriculum/loader';
import type { QuestionTemplate } from '@/types';
import type { ArchetypeId } from '@/types/archetype';

interface UseCurriculumResult {
  loading: boolean;
  templates: QuestionTemplate[];
  templatesByArchetype: (archetype: ArchetypeId) => QuestionTemplate[];
}

export function useCurriculum(): UseCurriculumResult {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);

  useEffect(() => {
    loadCurriculumBundle()
      .then((bundle) => {
        setTemplates(bundle.questionTemplates);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const templatesByArchetype = (archetype: ArchetypeId) =>
    templates.filter((t) => t.archetype === archetype);

  return { loading, templates, templatesByArchetype };
}
