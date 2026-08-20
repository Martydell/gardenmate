import type { CommunityPostWithLikes } from '../../hooks/useCommunityPosts';

interface PostCardProps {
  post: CommunityPostWithLikes;
  onLike: () => void;
}

function PostCard({ post, onLike }: PostCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800">
        <img src={post.before_photo_url} alt="Before" className="aspect-square w-full object-cover" />
        <img src={post.after_photo_url} alt="After" className="aspect-square w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="truncate font-medium">{post.plant_name}</p>
        <p className="truncate text-xs text-neutral-500">by {post.poster_name}</p>
        {post.caption && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {post.caption}
          </p>
        )}
        <button
          type="button"
          onClick={onLike}
          aria-pressed={post.likedByMe}
          className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${
            post.likedByMe ? 'text-red-600' : 'text-neutral-500'
          }`}
        >
          <span aria-hidden="true">{post.likedByMe ? '❤️' : '🤍'}</span>
          Inspiring{post.likeCount > 0 ? ` (${post.likeCount})` : ''}
        </button>
      </div>
    </div>
  );
}

interface InspireSectionProps {
  posts: CommunityPostWithLikes[];
  isLoading: boolean;
  onLike: (postId: string) => void;
}

function InspireSection({ posts, isLoading, onLike }: InspireSectionProps) {
  if (!isLoading && posts.length === 0) return null;

  return (
    <div className="px-4">
      <h2 className="mb-2 font-semibold">Inspire ✨</h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={() => onLike(post.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default InspireSection;
