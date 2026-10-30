import { Link, useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/States';
import { EmptyState } from '@/components/States';
import { ResourceCard } from '@/components/ResourceCard';
import { useResourceActions } from '@/components/ResourceActions';
import { SectionTitle } from '@/components/PageHeader';
import { UploadZone } from '@/components/UploadZone';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { useUser } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import { getGreeting } from '@/utils/format';
import { setPendingFile } from '@/utils/pendingFile';

export default function Home() {
  usePageTitle();
  const user = useUser();
  const navigate = useNavigate();
  const resources = useQuery(() => api.resources.list(), []);
  const folders = useQuery(() => api.folders.list(), []);
  const stats = useQuery(() => api.stats.get(), []);
  const { getMenu, dialogs } = useResourceActions();

  const folderName = (id: string | null) => folders.data?.find((f) => f.id === id)?.name;
  const recent = resources.data?.slice(0, 8) ?? [];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold sm:text-4xl">{getGreeting()}, {user.name}</h1>
        <p className="mt-2 text-lg text-muted">What would you like to study today?</p>

        <UploadZone
          className="mt-8"
          onFile={(file) => {
            setPendingFile(file);
            navigate('/upload');
          }}
        />

        <section aria-labelledby="recent-title" className="mt-12">
          <SectionTitle
            action={
              resources.data && resources.data.length > 0 ? (
                <Link to="/library" className="text-sm font-medium text-accent-text hover:underline">View library</Link>
              ) : undefined
            }
          >
            <span id="recent-title">Recent resources</span>
          </SectionTitle>

          {resources.loading && <LoadingState label="Loading your resources…" className="py-10" />}
          {resources.error && <ErrorState message={resources.error.message} onRetry={resources.refetch} />}
          {resources.data && recent.length === 0 && (
            <Card>
              <EmptyState icon={Library} title="Your library is empty" description="Upload a course to start creating quizzes and summaries.">
                <ButtonLink to="/upload">Upload your first course</ButtonLink>
              </EmptyState>
            </Card>
          )}
          {recent.length > 0 && (
            <ul className="grid gap-3 lg:grid-cols-2">
              {recent.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <ResourceCard resource={r} menu={getMenu(r)} folderName={folderName(r.folderId)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats.data && (
        <aside aria-labelledby="progress-title" className="mt-12 xl:sticky xl:top-28 xl:mt-0">
          <SectionTitle><span id="progress-title">Your progress</span></SectionTitle>
          <Card>
            <dl className="grid grid-cols-3 divide-x divide-border text-center xl:grid-cols-1 xl:divide-x-0 xl:divide-y">
              {[
                ['Quizzes completed', String(stats.data.quizzesCompleted)],
                ['Average score', `${stats.data.averageScore}%`],
                ['Topics mastered', String(stats.data.topicsMastered)],
              ].map(([label, value]) => (
                <div key={label} className="px-2 py-5 xl:py-6">
                  <dd className="text-2xl font-semibold tabular-nums sm:text-3xl xl:text-4xl">{value}</dd>
                  <dt className="mt-1 text-xs text-muted sm:text-sm">{label}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      )}
      {dialogs}
    </div>
  );
}
