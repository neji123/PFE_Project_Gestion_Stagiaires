import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { PostDto, PostService, PostLikeDto } from '../../../services/PostPublication/post-service.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-publication-item',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './publication-item.component.html',
  styleUrls: ['./publication-item.component.scss']
})
export class PublicationItemComponent {
  @Input() post!: PostDto;
  @Output() refreshRequested = new EventEmitter<void>();
  
  likeLoading = false;
  commentLoading = false;
  commentError: string | null = null;
  commentText = '';
  isLikedByCurrentUser = false;
  imageError: { [userId: string]: boolean } = {};
  
  // Properties pour image modal et commentaires
  showImageModal = false;
  selectedImage = '';
  showAllComments = false;

  // NOUVELLES PROPRIÉTÉS pour la modal des likes
  showLikesModal = false;
  likesLoading = false;
  postLikes: PostLikeDto[] = [];

    // Edition
  isEditMode = false;
  editContent: string = '';
  editAttachments: File[] = [];
  editError: string | null = null;
  editSubmitting = false;
  showDeleteConfirm = false;
  deleteError: string | null = null;

  constructor(
    private postService: PostService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.isLikedByCurrentUser = !!this.post.likedByCurrentUser;
  }

  get currentUser() {
    return this.auth.currentUserValue;
  }

  /**
   * Get safe user profile image URL with fallback handling
   */
  getUserImageUrl(user: any): string {
    if (!user) {
      return this.getDefaultImagePath();
    }

    const imageUrl = user.profilePictureUrl || 
                    user.ProfilePictureUrl || 
                    user.profileImage || 
                    user.imageUrl ||
                    user.photoUrl ||
                    user.avatar;

    if (!imageUrl) {
      return this.getDefaultImagePath();
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    if (imageUrl.startsWith('/')) {
      return this.buildAbsoluteUrl(imageUrl);
    }

    return this.buildAbsoluteUrl(`/uploads/${imageUrl}`);
  }

  /**
   * Get attachment URL
   */
  getAttachmentUrl(attachment: any): string {
    if (!attachment?.fileUrl) {
      return '';
    }

    const fileUrl = attachment.fileUrl;

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }

    return this.buildAbsoluteUrl(fileUrl);
  }

  /**
   * Handle image loading errors
   */
  handleImageError(event: Event, userId: string | undefined) {
    if (userId) {
      this.imageError[userId] = true;
    }
    
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = this.getDefaultImagePath();
    }
  }

  /**
   * Hide failed attachment images
   */
  hideFailedImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.style.display = 'none';
    }
  }

  /**
   * Extract filename from URL safely
   */
  getFileName(fileUrl: string | undefined): string {
    if (!fileUrl) {
      return 'Download file';
    }
    
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || 'Download file';
  }

  /**
   * Toggle like/unlike for the post
   */
  toggleLike() {
    if (this.likeLoading) return;
    
    this.likeLoading = true;

    const operation = this.isLikedByCurrentUser 
      ? this.postService.unlikePost(this.post.id)
      : this.postService.likePost(this.post.id);

    operation.subscribe({
      next: () => {
        this.isLikedByCurrentUser = !this.isLikedByCurrentUser;
        this.post.likesCount += this.isLikedByCurrentUser ? 1 : -1;
        this.likeLoading = false;
      },
      error: (error) => {
        console.error('Error toggling like:', error);
        this.likeLoading = false;
      }
    });
  }

  /**
   * Add a comment to the post
   */
  addComment() {
    if (!this.commentText.trim() || this.commentLoading) return;
    
    this.commentLoading = true;
    this.commentError = null;

    this.postService.addComment(this.post.id, this.commentText.trim()).subscribe({
      next: () => {
        this.commentText = '';
        this.refreshRequested.emit();
        this.commentLoading = false;
      },
      error: (err) => {
        this.commentError = err.message || 'Erreur lors de l\'ajout du commentaire';
        this.commentLoading = false;
      }
    });
  }

  /**
   * Check if user can comment
   */
  canComment(): boolean {
    const user = this.currentUser;
    return user && (user.role === 'Tuteur' || user.role === 'Stagiaire'|| user.role === 'RHs');
  }

  /**
   * NOUVELLE MÉTHODE : Ouvre la modal des likes
   */
  openLikesModal() {
    if (this.post.likesCount === 0) return;
    
    this.showLikesModal = true;
    this.likesLoading = true;
    this.postLikes = [];

    this.postService.getPostLikes(this.post.id).subscribe({
      next: (likes) => {
        this.postLikes = likes;
        this.likesLoading = false;
      },
      error: (error) => {
        console.error('Error loading likes:', error);
        this.likesLoading = false;
      }
    });
  }

  /**
   * NOUVELLE MÉTHODE : Ferme la modal des likes
   */
  closeLikesModal() {
    this.showLikesModal = false;
    this.postLikes = [];
  }

  /**
   * Get the default profile image path
   */
  private getDefaultImagePath(): string {
    return 'assets/images/default-profile.jpg';
  }

  /**
   * Build absolute URL from relative path
   */
  private buildAbsoluteUrl(relativePath: string): string {
    const baseUrl = environment.apiUrl.replace(/\/$/, '');
    const cleanPath = relativePath.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if attachment is an image
   */
  isImageAttachment(attachment: any): boolean {
    return attachment?.fileType === 'image' || 
           ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(this.getFileExtension(attachment?.fileUrl || ''));
  }

  /**
   * Open image in modal
   */
  openImageModal(attachment: any) {
    this.selectedImage = this.getAttachmentUrl(attachment);
    this.showImageModal = true;
  }

  /**
   * Close image modal
   */
  closeImageModal() {
    this.showImageModal = false;
    this.selectedImage = '';
  }

  /**
   * Get visible comments
   */
  getVisibleComments() {
    if (!this.post.comments) return [];
    return this.showAllComments ? this.post.comments : this.post.comments.slice(0, 2);
  }

  /**
   * Check if there are more comments to show
   */
  hasMoreComments(): boolean {
    return this.post.comments && this.post.comments.length > 2;
  }

  /**
   * Get remaining comments count
   */
  getRemainingCommentsCount(): number {
    return this.post.comments ? Math.max(0, this.post.comments.length - 2) : 0;
  }

  /**
   * Toggle show all comments
   */
  toggleShowAllComments() {
    this.showAllComments = !this.showAllComments;
  }

  /**
   * Check if attachment is a PDF
   */
  isPdfAttachment(attachment: any): boolean {
    return attachment?.fileType === 'pdf' || 
           this.getFileExtension(attachment?.fileUrl || '') === 'pdf';
  }

  /**
   * Open PDF in new window
   */
  openPdfInNewWindow(attachment: any) {
    const pdfUrl = this.getAttachmentUrl(attachment);
    window.open(pdfUrl, '_blank');
  }

  /**
   * Handle Enter key for comments
   */
  onEnterKeyDown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.ctrlKey) {
      keyboardEvent.preventDefault();
      this.addComment();
    }
  }
 // showEditDelete(): boolean { return true; }

/*  showEditDelete(): boolean {
    // RH qui est l’auteur
    return this.currentUser &&
      this.currentUser.role === 'RHs' &&
      this.currentUser.id === this.post.author?.id;
  }*/
 showEditDelete(): boolean {
  return !!this.currentUser &&
    this.currentUser.role === 'RHs' &&
    String(this.currentUser.id) === String(this.post.author?.id);
}

   // ===================== Edition =====================

  openEditModal() {
    this.isEditMode = true;
    this.editContent = this.post.content;
    this.editAttachments = [];
    this.editError = null;
  }

  onEditFilesSelected(event: Event) {
    const files = (event.target as HTMLInputElement)?.files;
    this.editAttachments = files ? Array.from(files) : [];
  }

  submitEdit() {
    if (!this.editContent.trim()) {
      this.editError = "Le contenu ne peut pas être vide.";
      return;
    }
    this.editSubmitting = true;
    this.editError = null;
    const formData = new FormData();
    formData.append('Content', this.editContent.trim());
    for (const file of this.editAttachments) {
      formData.append('Attachments', file);
    }
    this.postService.updatePost(this.post.id, formData).subscribe({
      next: () => {
        this.isEditMode = false;
        this.editSubmitting = false;
        this.refreshRequested.emit();
      },
      error: (err) => {
        this.editError = err.error?.message || "Erreur lors de la modification.";
        this.editSubmitting = false;
      }
    });
  }

  cancelEdit() {
    this.isEditMode = false;
    this.editError = null;
    this.editContent = '';
    this.editAttachments = [];
  }

  // ===================== Suppression =====================

  openDeleteConfirm() {
    this.showDeleteConfirm = true;
    this.deleteError = null;
  }
  cancelDelete() {
    this.showDeleteConfirm = false;
    this.deleteError = null;
  }

  confirmDelete() {
    this.deleteError = null;
    this.postService.deletePost(this.post.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.refreshRequested.emit();
      },
      error: (err) => {
        this.deleteError = err.error?.message || "Erreur lors de la suppression.";
      }
    });
  }
  
}