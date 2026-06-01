import { Component } from "@angular/core";

@Component({
  selector: "app-sample",
  template: `<pre>{{ data | json }}</pre>`,
})
export class SampleComponent {
  data = { name: "angular 示例", items: [1, 2, 3] };
}
