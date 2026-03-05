import { Exam } from '../../services/examService';
import ExamCard from './ExamCard';

interface ExamListProps {
  exams: Exam[];
}

const ExamList: React.FC<ExamListProps> = ({ exams }) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => (
        <ExamCard key={exam.id} exam={exam} />
      ))}
    </div>
  );
};

export default ExamList;
