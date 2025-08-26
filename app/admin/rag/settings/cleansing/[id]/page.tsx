import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminLayout from '@/components/admin/admin-layout';
import { RAGNavigation } from '@/app/admin/rag/components/rag-navigation';
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
    // API 호출 대신 직접 repository 사용
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
  
  // 디버깅
  console.log('Page - id from params:', id);
  console.log('Page - fetched config:', config);
  console.log('Page - isEdit:', id !== 'new');

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 max-w-2xl">
        <CleansingForm
          initialData={config}
          isEdit={id !== 'new'}
        />
      </div>
    </AdminLayout>
  );
}
