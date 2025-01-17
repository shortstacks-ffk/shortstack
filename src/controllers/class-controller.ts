import { ClassModel, Class} from '../models/class-model';

export class ClassController {
    private model: ClassModel;

    constructor() {
        this.model = new ClassModel();
    }

    getAllClasses(): Class[] {
        return this.model.getClasses();
    }

    createClass(): Class {
        const className = `Class ${this.model.getClasses().length + 1}`;
        return this.model.addClass(className);
    }
}