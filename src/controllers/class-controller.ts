import { ClassModel, Class} from '../models/class-model';

export class ClassController {
    private model: ClassModel;

    constructor() {
        this.model = new ClassModel();
    }

    getAllClasses(): Class[] {
        return this.model.getClasses();
    }

    createClass(classData: Omit<Class, 'id'>): Class {
        return this.model.addClass(classData);
      }
}