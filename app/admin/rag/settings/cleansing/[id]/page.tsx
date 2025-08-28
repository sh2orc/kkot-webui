import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CleansingForm } from '@/app/admin/rag/components/cleansing-form';
import { ragCleansingConfigRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getCleansingConfig(id: string) {
  if (id === 'new') return null;
  
  try {
    // Use repository directly instead of API call
    const configId = parseInt(id);
    if (isNaN(configId)) {
      console.error('Invalid config ID:', id);
      return null;
    }
    
    const config = await ragCleansingConfigRepository.findById(configId);
    console.log('Found config from DB:', config);
    return config;
  } catch (error) {
    console.error('Error fetching cleansing config:', error);
    return null;
  }
}

export default async function CleansingDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth');
  }

  const { id } = await params;
  const config = await getCleansingConfig(id);
  
  // Debugging
  console.log('Page - id from params:', id);
  console.log('Page - fetched config:', config);
  console.log('Page - isEdit:', id !== 'new');

  return (
    <div className="max-w-2xl">
      <CleansingForm
        initialData={config}
        isEdit={id !== 'new'}
      />
    </div>
  );
}
