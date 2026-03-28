import { TestAttemptScreen } from '@/components/test/TestAttemptScreen';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttemptPage({ params }: Props) {
  const { id } = await params;
  return <TestAttemptScreen attemptId={parseInt(id)} />;
}
