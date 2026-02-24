'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ConversationPreview } from '@/lib/types/messages';
import { formatRelativeTime } from '@/lib/utils/time';
import { useAuth } from '@/hooks/useAuth';
import { Search, Loader2 } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/messages');
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/conversations?limit=50');
        const json = await res.json();
        
        if (!json.success) {
          throw new Error(json.error?.message || 'Failed to fetch conversations');
        }
        
        setConversations(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-xl bg-gray-50/50">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Messages</h1>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Search header maybe later */}
        <div className="border-b px-6 py-4 bg-gray-50/50 flex items-center">
           <div className="relative w-full max-w-sm">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-5 w-5 text-gray-400" />
             </div>
             <input
               type="text"
               placeholder="Search conversations..."
               className="block w-full pl-10 pr-3 py-2 border border-gray-200 text-gray-900 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
             />
           </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        <div className="divide-y divide-gray-100">
          {conversations.length === 0 && !error ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg font-medium text-gray-900">No messages yet</p>
              <p className="mt-1">When you connect with hosts or guests, your messages will appear here.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = conv.other_user;
              const lastMsg = conv.last_message;
              const timestamp = lastMsg?.created_at || conv.updated_at;

              return (
                <Link 
                  href={`/messages/${conv.id}`} 
                  key={conv.id}
                  className="block hover:bg-gray-50 transition-colors duration-150 relative"
                >
                  <div className="p-4 sm:px-6 flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {otherUser?.avatar_url ? (
                        <Image 
                          src={otherUser.avatar_url} 
                          alt={otherUser.username} 
                          width={48}
                          height={48}
                          className="rounded-full object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                          {otherUser?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      
                      {/* Unread badge indicator simple dot version */}
                      {conv.unread_count > 0 && (
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {otherUser?.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatRelativeTime(timestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {lastMsg ? (
                            lastMsg.sender_id === user?.id ? `You: ${lastMsg.content}` : lastMsg.content
                          ) : (
                            <span className="italic text-gray-400">No messages yet</span>
                          )}
                        </p>
                        
                        {/* Unread count badge */}
                        {conv.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 ml-2 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
