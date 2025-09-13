'use client';

import { User } from '@/types';

interface UserListProps {
  users: User[];
  hostId: string;
}

export default function UserList({ users, hostId }: UserListProps) {
  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="text-white font-semibold mb-3">
        Users ({users.length})
      </h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-200 text-sm">{user.username}</span>
            </div>
            {user.id === hostId && (
              <span className="text-yellow-500 text-xs">👑 Host</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}