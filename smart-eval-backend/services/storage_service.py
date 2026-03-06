"""
File Storage Service

Handles file uploads and storage (local filesystem for now, can be extended to S3/MinIO)
"""
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app
from utils.exceptions import ValidationError


class StorageService:
    """Service for file storage operations"""
    
    ALLOWED_EXTENSIONS = {
        'question_paper': {'pdf', 'doc', 'docx'},
        'model_answer': {'pdf', 'doc', 'docx'},
        'answer_sheet': {'pdf', 'jpg', 'jpeg', 'png'}
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @staticmethod
    def allowed_file(filename, file_type='answer_sheet'):
        """Check if file extension is allowed"""
        if '.' not in filename:
            return False
        ext = filename.rsplit('.', 1)[1].lower()
        return ext in StorageService.ALLOWED_EXTENSIONS.get(file_type, set())
    
    @staticmethod
    def validate_file(file, file_type='answer_sheet'):
        """
        Validate uploaded file
        
        Args:
            file: FileStorage object from Flask request
            file_type: Type of file (question_paper, model_answer, answer_sheet)
        
        Raises:
            ValidationError: If file is invalid
        """
        if not file:
            raise ValidationError("No file provided")
        
        if file.filename == '':
            raise ValidationError("No file selected")
        
        if not StorageService.allowed_file(file.filename, file_type):
            allowed = ', '.join(StorageService.ALLOWED_EXTENSIONS[file_type])
            raise ValidationError(f"Invalid file type. Allowed types: {allowed}")
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_length > StorageService.MAX_FILE_SIZE:
            max_mb = StorageService.MAX_FILE_SIZE / (1024 * 1024)
            raise ValidationError(f"File too large. Maximum size: {max_mb}MB")
        
        return file_length  # Return file size for later use
    
    @staticmethod
    def save_file(file, folder_path, prefix=''):
        """
        Save file to storage
        
        Args:
            file: FileStorage object from Flask request
            folder_path: Relative folder path (e.g., 'exams/exam_id')
            prefix: Optional filename prefix
        
        Returns:
            dict with file_url and filename
        
        Raises:
            ValidationError: If file save fails
        """
        try:
            # Get file size first
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)  # Reset file pointer
            
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            ext = original_filename.rsplit('.', 1)[1].lower()
            unique_id = str(uuid.uuid4())
            filename = f"{prefix}_{unique_id}.{ext}" if prefix else f"{unique_id}.{ext}"
            
            # Create full directory path
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            full_folder = os.path.join(upload_folder, folder_path)
            os.makedirs(full_folder, exist_ok=True)
            
            # Save file
            file_path = os.path.join(full_folder, filename)
            file.save(file_path)
            
            # Generate file URL (relative path for now)
            file_url = f"/uploads/{folder_path}/{filename}"
            
            return {
                'file_url': file_url,
                'filename': filename,
                'original_filename': original_filename,
                'saved_path': file_path,
                'file_size': file_size,
                'uploaded_at': datetime.utcnow()
            }
            
        except Exception as e:
            raise ValidationError(f"Failed to save file: {str(e)}")
    
    @staticmethod
    def delete_file(file_path):
        """
        Delete file from storage
        
        Args:
            file_path: Full path to file
        
        Returns:
            bool: True if deleted, False if file not found
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False
    
    @staticmethod
    def save_question_paper(file, exam_id):
        """
        Save question paper for an exam
        
        Args:
            file: FileStorage object
            exam_id: Exam ID
        
        Returns:
            dict with file details
        """
        StorageService.validate_file(file, 'question_paper')
        folder_path = f"exams/{exam_id}/question_papers"
        return StorageService.save_file(file, folder_path, prefix='question_paper')
    
    @staticmethod
    def save_model_answer(file, exam_id):
        """
        Save model answer for an exam
        
        Args:
            file: FileStorage object
            exam_id: Exam ID
        
        Returns:
            dict with file details
        """
        StorageService.validate_file(file, 'model_answer')
        folder_path = f"exams/{exam_id}/model_answers"
        return StorageService.save_file(file, folder_path, prefix='model_answer')
    
    @staticmethod
    def save_answer_sheet(file, exam_id, student_id):
        """
        Save student answer sheet for an exam
        
        Args:
            file: FileStorage object
            exam_id: Exam ID
            student_id: Student ID
        
        Returns:
            dict with file details
        """
        StorageService.validate_file(file, 'answer_sheet')
        folder_path = f"exams/{exam_id}/answer_sheets"
        prefix = f"student_{student_id}"
        return StorageService.save_file(file, folder_path, prefix=prefix)
