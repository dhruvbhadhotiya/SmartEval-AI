import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import studentService, { ChallengeData } from '../../services/studentService';
import { useToast } from '../../components/ToastProvider';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  under_review: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const StudentChallengePage: React.FC = () => {
  const [items, setItems] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await studentService.getChallenges();
        if (active) setItems(data);
      } catch (err: any) {
        const msg = err.response?.data?.message ?? 'Failed to load challenges';
        if (active) setError(msg);
        showToast(msg, 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My challenges"
        subtitle="Track grade re-evaluation requests you've submitted."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No challenges yet"
          description="When you raise a grade challenge from a result, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <Card key={c.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {c.exam_title ?? 'Exam'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Submitted {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    statusStyles[c.status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {c.status.replace('_', ' ')}
                </span>
              </div>

              <ul className="space-y-2 text-sm">
                {c.challenged_questions.map((q) => (
                  <li
                    key={q.question_number}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between text-gray-800">
                      <span className="font-medium">Question {q.question_number}</span>
                      <span className="text-xs text-gray-500">
                        Original: {q.original_score}/{q.max_marks}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 line-clamp-3">
                      {q.student_justification}
                    </p>
                  </li>
                ))}
              </ul>

              {c.resolution && (
                <div className="mt-3 rounded-lg border border-gray-100 bg-white p-3 text-sm">
                  <p className="font-medium text-gray-900">Resolution</p>
                  <p className="mt-1 text-gray-600">{c.resolution.comments}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentChallengePage;
