// 对象字面量示例
// 使用字面量语法创建对象
let person = {
  name: "Alice",
  age: 25,
  greet: function () {
    console.log("Hello, " + this.name);
  },
};

// person 是一个对象实例
console.log(typeof person); // "object"
console.log(person instanceof Object); // true

// 调用方法
person.greet();
