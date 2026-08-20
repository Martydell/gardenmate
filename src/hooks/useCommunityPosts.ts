import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import type { CommunityPost } from '../types';

export interface CommunityPostWithLikes extends CommunityPost {
  likeCount: number;
  likedByMe: boolean;
}

const FEED_LIMIT = 6;

export interface NewCommunityPostInput {
  plantId: string | null;
  plantName: string;
  posterName: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  caption: string | null;
}

// Public feed (most recent posts from ALL users), so this is deliberately
// not scoped by useUserStore's userId the way usePlants/useCareLog etc. are
// — it only needs userId to know which posts *this viewer* has liked.
export function useCommunityPosts() {
  const userId = useUserStore((state) => state.user?.id);
  const [posts, setPosts] = useState<CommunityPostWithLikes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyFeedResult = useCallback(
    (postRows: CommunityPost[], likeRows: { post_id: string; user_id: string }[]) => {
      const withLikes: CommunityPostWithLikes[] = postRows.map((post) => {
        const likesForPost = likeRows.filter((like) => like.post_id === post.id);
        return {
          ...post,
          likeCount: likesForPost.length,
          likedByMe: userId ? likesForPost.some((like) => like.user_id === userId) : false,
        };
      });
      setError(null);
      setPosts(withLikes);
    },
    [userId],
  );

  // Effect fetches via a plain .then() chain (not an awaited async helper)
  // so every setState call is lexically inside the .then() callback — this
  // keeps the same shape as usePlants/useCareLog/etc. and avoids the
  // set-state-in-effect lint warning that calling an async function from
  // an effect triggers.
  useEffect(() => {
    let cancelled = false;

    supabase
      .from('posts')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT)
      .then(async ({ data: postRows, error: postsError }) => {
        if (cancelled) return;
        if (postsError) {
          setError(postsError.message);
          setIsLoading(false);
          return;
        }

        const ids = (postRows ?? []).map((post) => post.id);
        let likeRows: { post_id: string; user_id: string }[] = [];
        if (ids.length > 0) {
          const { data } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', ids);
          likeRows = data ?? [];
        }
        if (cancelled) return;

        applyFeedResult((postRows ?? []) as CommunityPost[], likeRows);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyFeedResult]);

  const loadFeed = useCallback(async () => {
    try {
      const { data: postRows, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT);

      if (postsError) {
        setError(postsError.message);
        return;
      }

      const ids = (postRows ?? []).map((post) => post.id);
      let likeRows: { post_id: string; user_id: string }[] = [];
      if (ids.length > 0) {
        const { data } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', ids);
        likeRows = data ?? [];
      }

      applyFeedResult((postRows ?? []) as CommunityPost[], likeRows);
    } catch {
      setError('Something went wrong loading the community feed.');
    }
  }, [applyFeedResult]);

  const createPost = useCallback(
    async (input: NewCommunityPostInput) => {
      if (!userId) return null;
      try {
        const { data, error: insertError } = await supabase
          .from('posts')
          .insert({
            user_id: userId,
            plant_id: input.plantId,
            plant_name: input.plantName,
            poster_name: input.posterName,
            before_photo_url: input.beforePhotoUrl,
            after_photo_url: input.afterPhotoUrl,
            caption: input.caption,
            is_public: true,
          })
          .select()
          .single();

        if (insertError) {
          notifyError(insertError.message);
          return null;
        }
        notifySuccess('Shared to the community!');
        loadFeed();
        return data as CommunityPost;
      } catch {
        notifyError();
        return null;
      }
    },
    [userId, loadFeed],
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const wasLiked = post.likedByMe;

      // Optimistic: a like should feel instant, this isn't precious data.
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
            : p,
        ),
      );

      try {
        if (wasLiked) {
          await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
        }
      } catch {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likedByMe: wasLiked, likeCount: post.likeCount } : p)),
        );
        notifyError('Could not update your like.');
      }
    },
    [userId, posts],
  );

  return { posts, isLoading, error, createPost, toggleLike };
}
