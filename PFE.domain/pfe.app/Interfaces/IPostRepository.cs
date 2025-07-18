using PFE.domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
    public interface IPostRepository
    {
        Task<Post> AddPostAsync(Post post);
        Task<Post> GetPostByIdAsync(int id);
        Task<IEnumerable<Post>> GetAllPostsAsync();
        Task AddLikeAsync(PostLike like);
        Task RemoveLikeAsync(int postId, int userId);
        Task AddCommentAsync(PostComment comment);
        Task UpdatePostAsync(Post post);
        Task DeletePostAsync(int postId);
    }
}