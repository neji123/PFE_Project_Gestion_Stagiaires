using PFE.application.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
    public interface IPostService
    {
        Task<PostDto> CreatePostAsync(int authorId, PostCreateDto dto);
        Task<IEnumerable<PostDto>> GetAllPostsAsync(int currentUserId);
        Task LikePostAsync(int postId, int userId);
        Task UnlikePostAsync(int postId, int userId);
        Task AddCommentAsync(int postId, int userId, string comment);
        Task<IEnumerable<PostLikeDto>> GetPostLikesAsync(int postId);
        Task<PostDto> UpdatePostAsync(int postId, int userId, PostCreateDto dto);
        Task DeletePostAsync(int postId, int userId);

    }
}