using Microsoft.AspNetCore.Hosting;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace PFE.application.Services
{
    public class PostService : IPostService
    {
        private readonly IPostRepository _postRepository;
        private readonly IUserRepository _userRepository;
        private readonly IWebHostEnvironment _env;

        public PostService(IPostRepository postRepository, IUserRepository userRepository, IWebHostEnvironment env)
        {
            _postRepository = postRepository;
            _userRepository = userRepository;
            _env = env;
        }

        public async Task<PostDto> CreatePostAsync(int authorId, PostCreateDto dto)
        {
            var author = await _userRepository.GetByIdAsync(authorId);
            if (author == null) throw new Exception("Auteur introuvable");

            var post = new Post
            {
                Content = dto.Content,
                AuthorId = authorId,
                CreatedAt = DateTime.UtcNow
            };

            // Upload des fichiers
            if (dto.Attachments != null && dto.Attachments.Any())
            {
                foreach (var file in dto.Attachments)
                {
                    var fileName = $"{Guid.NewGuid()}_{file.FileName}";
                    var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                    if (!Directory.Exists(uploadsFolder))
                        Directory.CreateDirectory(uploadsFolder);
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    post.Attachments.Add(new PostAttachment
                    {
                        FileUrl = $"/uploads/{fileName}",
                        FileType = file.ContentType != null && file.ContentType.StartsWith("image") ? "image" : "document"
                    });
                }
            }

            post = await _postRepository.AddPostAsync(post);
            return await MapPostToDtoAsync(post.Id);
        }

        public async Task<IEnumerable<PostDto>> GetAllPostsAsync(int currentUserId)
        {
            var posts = await _postRepository.GetAllPostsAsync();
            return posts.Select(post => MapPostToDto(post, currentUserId));
        }

        public async Task LikePostAsync(int postId, int userId)
        {
            var post = await _postRepository.GetPostByIdAsync(postId);
            if (post == null) throw new Exception("Post introuvable");

            if (post.Likes.Any(l => l.UserId == userId))
                throw new Exception("Déjà liké");

            await _postRepository.AddLikeAsync(new PostLike
            {
                PostId = postId,
                UserId = userId,
                LikedAt = DateTime.UtcNow
            });
        }

        public async Task UnlikePostAsync(int postId, int userId)
        {
            await _postRepository.RemoveLikeAsync(postId, userId);
        }

        public async Task AddCommentAsync(int postId, int userId, string comment)
        {
            if (string.IsNullOrWhiteSpace(comment))
                throw new Exception("Commentaire vide");

            await _postRepository.AddCommentAsync(new PostComment
            {
                PostId = postId,
                UserId = userId,
                Comment = comment,
                CommentedAt = DateTime.UtcNow,
            });
        }

        // MÉTHODE CORRIGÉE : Récupérer les likes d'un post
        public async Task<IEnumerable<PostLikeDto>> GetPostLikesAsync(int postId)
        {
            var post = await _postRepository.GetPostByIdAsync(postId);
            if (post == null)
                throw new Exception("Post introuvable");

            // Option 1: Retourner directement IEnumerable (recommandé)
            if (post.Likes == null || !post.Likes.Any())
                return Enumerable.Empty<PostLikeDto>();

            return post.Likes.Select(like => new PostLikeDto
            {
                Id = like.Id,
                LikedAt = like.LikedAt,
                User = like.User != null ? new UserDto
                {
                    Id = like.User.Id,
                    Username = like.User.Username,
                    FirstName = like.User.FirstName,
                    LastName = like.User.LastName,
                    ProfilePictureUrl = like.User.ProfilePictureUrl
                } : null
            }).OrderByDescending(l => l.LikedAt);

            // Option 2: Si vous voulez absolument retourner une List
            /*
            return post.Likes?.Select(like => new PostLikeDto
            {
                Id = like.Id,
                LikedAt = like.LikedAt,
                User = like.User != null ? new UserDto
                {
                    Id = like.User.Id,
                    Username = like.User.Username,
                    FirstName = like.User.FirstName,
                    LastName = like.User.LastName,
                    ProfilePictureUrl = like.User.ProfilePictureUrl
                } : null
            }).OrderByDescending(l => l.LikedAt).ToList() ?? new List<PostLikeDto>();
            */
        }

        // ----- Helpers -----
        private async Task<PostDto> MapPostToDtoAsync(int postId)
        {
            var post = await _postRepository.GetPostByIdAsync(postId);
            return MapPostToDto(post);
        }

        private PostDto MapPostToDto(Post post, int? currentUserId = null)
        {
            return new PostDto
            {
                Id = post.Id,
                Content = post.Content,
                CreatedAt = post.CreatedAt,
                Author = post.Author != null ? new UserDto
                {
                    Id = post.Author.Id,
                    Username = post.Author.Username,
                    FirstName = post.Author.FirstName,
                    LastName = post.Author.LastName,
                    ProfilePictureUrl = post.Author.ProfilePictureUrl
                } : null,
                Attachments = post.Attachments?.Select(a => new PostAttachmentDto
                {
                    Id = a.Id,
                    FileUrl = a.FileUrl,
                    FileType = a.FileType
                }).ToList(),
                LikesCount = post.Likes?.Count ?? 0,
                Comments = post.Comments?.Select(c => new PostCommentDto
                {
                    Id = c.Id,
                    Comment = c.Comment,
                    CommentedAt = c.CommentedAt,
                    User = c.User != null ? new UserDto
                    {
                        Id = c.User.Id,
                        Username = c.User.Username,
                        FirstName = c.User.FirstName,
                        LastName = c.User.LastName,
                        ProfilePictureUrl = c.User.ProfilePictureUrl
                    } : null
                }).ToList(),
                LikedByCurrentUser = currentUserId.HasValue && post.Likes.Any(l => l.UserId == currentUserId.Value)
            };
        }
        public async Task<PostDto> UpdatePostAsync(int postId, int userId, PostCreateDto dto)
        {
            var post = await _postRepository.GetPostByIdAsync(postId);
            if (post == null) throw new Exception("Post introuvable");

            if (post.AuthorId != userId) throw new Exception("Vous n'avez pas le droit de modifier ce post.");

            post.Content = dto.Content;

            // Gérer ici la mise à jour des fichiers si tu veux permettre la modification des pièces jointes
            // (ex: suppression puis ajout, ou ajout complémentaire)

            await _postRepository.UpdatePostAsync(post); // Ajoute cette méthode si besoin dans ton repo
            return await MapPostToDtoAsync(post.Id);
        }

        public async Task DeletePostAsync(int postId, int userId)
        {
            var post = await _postRepository.GetPostByIdAsync(postId);
            if (post == null) throw new Exception("Post introuvable");
            if (post.AuthorId != userId) throw new Exception("Vous n'avez pas le droit de supprimer ce post.");

            await _postRepository.DeletePostAsync(postId);
        }
    }
}