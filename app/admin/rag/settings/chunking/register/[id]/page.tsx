import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ChunkingForm } from '@/app/admin/rag/components/chunking-form';
import { ragChunkingStrategyRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getChunkingStrategy(id: string) {
  if (id === 'new') return null;
  
  try {
    // Use repository directly instead of API call
    const strategyId = parseInt(id);
    if (isNaN(strategyId)) {
      console.error('Invalid strategy ID:', id);
      return null;
    }
    
    const strategy = await ragChunkingStrategyRepository.findById(strategyId);
    console.log('Found strategy from DB:', strategy);
    return strategy;
  } catch (error) {
    console.error('Error fetching chunking strategy:', error);
    return null;
  }
}

export default async function ChunkingDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth');
  }

  const { id } = await params;
  const strategy = await getChunkingStrategy(id);

  return (
    <div className="max-w-2xl">
      <ChunkingForm
        initialData={strategy}
        isEdit={id !== 'new'}
      />
    </div>
  );
}
