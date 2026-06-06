"use client";

import DOMPurify from "isomorphic-dompurify";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteLesson } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

export function LibraryView({ id, html }: { id: string; html: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  const onDelete = async () => {
    if (!confirm("Delete this lesson from your library?")) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      await deleteLesson(supabase, id);
      router.push("/library");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <article className="mt-2 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="no-print flex items-center gap-2 justify-end border-b border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-800"
        >
          Export to PDF
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      <div className="lesson-html px-6 py-6" dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </article>
  );
}
