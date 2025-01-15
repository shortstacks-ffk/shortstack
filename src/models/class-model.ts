
export interface Class {
    id: string;
    name: string;
    content?: string;
}

export class ClassModel {
    constructor(private classes: Class[] = []) {}

    getClasses(): Class[] {
        return this.classes;
    }

    addClass(className: string): Class{
        var nextClassNumber = this.classes.length + 1;
        const newClass: Class = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Class ${nextClassNumber}`,
            content: `Content for ${nextClassNumber}`,
        };
        this.classes.push(newClass);
        return newClass;
    }

}
