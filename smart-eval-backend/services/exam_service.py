"""
Exam service
"""
from datetime import datetime
from mongoengine import DoesNotExist
from models.exam import Exam
from models.user import User
from utils.exceptions import ValidationError, NotFoundError, ForbiddenError


class ExamService:
    """Service for exam operations"""
    
    @staticmethod
    def create_exam(teacher_id, title, subject, exam_date=None, max_marks=100.0, duration_minutes=180):
        """
        Create a new exam
        
        Args:
            teacher_id: Teacher's user ID
            title: Exam title
            subject: Subject name
            exam_date: Optional exam date
            max_marks: Maximum marks for the exam (default: 100)
            duration_minutes: Exam duration in minutes (default: 180)
        
        Returns:
            Exam object
        
        Raises:
            ValidationError: If validation fails
            NotFoundError: If teacher not found
        """
        # Validate teacher exists
        try:
            teacher = User.objects.get(id=teacher_id, role='teacher')
        except DoesNotExist:
            raise NotFoundError("Teacher not found")
        
        # Validate required fields
        if not title or not title.strip():
            raise ValidationError("Exam title is required")
        
        if not subject or not subject.strip():
            raise ValidationError("Subject is required")
        
        # Parse exam date if provided as string
        if exam_date and isinstance(exam_date, str):
            try:
                exam_date = datetime.fromisoformat(exam_date.replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError("Invalid exam date format. Use ISO format")
        
        # Create exam
        exam = Exam(
            teacher_id=teacher,
            title=title.strip(),
            subject=subject.strip(),
            exam_date=exam_date,
            max_marks=max_marks,
            duration_minutes=duration_minutes,
            status='draft'
        )
        exam.save()
        
        return exam
    
    @staticmethod
    def get_teacher_exams(teacher_id, page=1, limit=20, status=None, sort_by='-created_at'):
        """
        Get all exams for a teacher with pagination
        
        Args:
            teacher_id: Teacher's user ID
            page: Page number (default: 1)
            limit: Items per page (default: 20)
            status: Filter by status (optional)
            sort_by: Sort field (default: -created_at)
        
        Returns:
            dict with exams and pagination meta
        """
        # Validate teacher exists
        try:
            teacher = User.objects.get(id=teacher_id, role='teacher')
        except DoesNotExist:
            raise NotFoundError("Teacher not found")
        
        # Build query
        query = Exam.objects(teacher_id=teacher)
        
        # Filter by status if provided
        if status and status != 'all':
            if status not in ['draft', 'configuring', 'grading', 'reviewing', 'published']:
                raise ValidationError(f"Invalid status: {status}")
            query = query.filter(status=status)
        
        # Get total count
        total = query.count()
        
        # Calculate pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Apply pagination and sorting
        exams = query.order_by(sort_by).skip(skip).limit(limit)
        
        return {
            'exams': [exam.to_summary_dict() for exam in exams],
            'meta': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': total_pages
            }
        }
    
    @staticmethod
    def get_exam_by_id(exam_id, teacher_id=None):
        """
        Get exam by ID
        
        Args:
            exam_id: Exam ID
            teacher_id: Optional teacher ID for authorization check
        
        Returns:
            Exam object
        
        Raises:
            NotFoundError: If exam not found
            ForbiddenError: If teacher doesn't own the exam
        """
        try:
            exam = Exam.objects.get(id=exam_id)
        except DoesNotExist:
            raise NotFoundError("Exam not found")
        
        # Check if teacher owns this exam
        if teacher_id and str(exam.teacher_id.id) != str(teacher_id):
            raise ForbiddenError("You don't have permission to access this exam")
        
        return exam
    
    @staticmethod
    def update_exam(exam_id, teacher_id, **update_data):
        """
        Update exam details
        
        Args:
            exam_id: Exam ID
            teacher_id: Teacher's user ID
            **update_data: Fields to update
        
        Returns:
            Updated Exam object
        
        Raises:
            NotFoundError: If exam not found
            ForbiddenError: If teacher doesn't own the exam or exam can't be edited
            ValidationError: If validation fails
        """
        exam = ExamService.get_exam_by_id(exam_id, teacher_id)
        
        # Check if exam can be edited
        if not exam.can_be_edited():
            raise ForbiddenError(f"Cannot edit exam in '{exam.status}' status")
        
        # Update allowed fields
        allowed_fields = ['title', 'subject', 'exam_date']
        
        for field, value in update_data.items():
            if field in allowed_fields:
                if field == 'exam_date' and isinstance(value, str):
                    try:
                        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except ValueError:
                        raise ValidationError("Invalid exam date format")
                
                if field in ['title', 'subject'] and (not value or not value.strip()):
                    raise ValidationError(f"{field} cannot be empty")
                
                setattr(exam, field, value.strip() if isinstance(value, str) else value)
        
        exam.save()
        return exam
    
    @staticmethod
    def delete_exam(exam_id, teacher_id):
        """
        Delete an exam
        
        Args:
            exam_id: Exam ID
            teacher_id: Teacher's user ID
        
        Returns:
            None
        
        Raises:
            NotFoundError: If exam not found
            ForbiddenError: If teacher doesn't own the exam or exam can't be deleted
        """
        exam = ExamService.get_exam_by_id(exam_id, teacher_id)
        
        # Check if exam can be deleted
        if not exam.can_be_deleted():
            raise ForbiddenError(f"Cannot delete exam in '{exam.status}' status. Only draft exams can be deleted")
        
        exam.delete()
    
    @staticmethod
    def update_exam_status(exam_id, teacher_id, new_status):
        """
        Update exam status
        
        Args:
            exam_id: Exam ID
            teacher_id: Teacher's user ID
            new_status: New status value
        
        Returns:
            Updated Exam object
        
        Raises:
            NotFoundError: If exam not found
            ForbiddenError: If teacher doesn't own the exam
            ValidationError: If invalid status or invalid status transition
        """
        exam = ExamService.get_exam_by_id(exam_id, teacher_id)
        
        # Validate status
        valid_statuses = ['draft', 'configuring', 'grading', 'reviewing', 'published']
        if new_status not in valid_statuses:
            raise ValidationError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Define valid status transitions
        valid_transitions = {
            'draft': ['configuring'],
            'configuring': ['draft', 'grading'],
            'grading': ['reviewing'],
            'reviewing': ['grading', 'published'],
            'published': []  # Cannot change status once published
        }
        
        if new_status not in valid_transitions.get(exam.status, []):
            raise ValidationError(
                f"Cannot transition from '{exam.status}' to '{new_status}'"
            )
        
        exam.status = new_status
        
        # Set published_at timestamp if publishing
        if new_status == 'published':
            exam.published_at = datetime.utcnow()
        
        exam.save()
        return exam
