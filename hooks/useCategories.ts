'use client';

import { useState, useEffect } from 'react';
import type { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => { if (j.success) setCategories(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
