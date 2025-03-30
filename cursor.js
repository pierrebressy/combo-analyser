function getNearestYValue(data, xValue) {
    const nearestPoint = data.reduce((prev, curr) =>
        Math.abs(curr.x - xValue) < Math.abs(prev.x - xValue) ? curr : prev
    );
    return nearestPoint;
}

export class Knob {
    constructor(svg, env, values, call_back) {
        this.values = values;
        this.call_back = call_back;
        this.current_value = this.values[0];
        this.knob_area_width = 200;
        this.knob_area_height = 200;
        this.knob_center_x = 100;
        this.knob_center_y = 100;
        this.knob_radius = 40;
        this.knob_dots_center_radius = 50;
        this.knob_labels_center_radius = 70;
        this.angleStep = 360 / values.length;
        this.angles = values.map((_, i) => i * this.angleStep);
        this.knob_area = svg.append("svg")
            .attr("width", this.knob_area_width)
            .attr("height", this.knob_area_height);
        this.area_width = this.knob_area.node().getBoundingClientRect().x;
        this.area_height = this.knob_area.node().getBoundingClientRect().y;

        this.knob_area.append("g")
            .attr("transform", `translate(${this.knob_center_x}, ${this.knob_center_y})`)
            .append("circle")
            .attr("r", this.knob_radius + 5)
            .attr("fill", "black")
            .attr("opacity", 0.1)
            .attr("cx", 3)
            .attr("cy", 3);
        this.knob = this.knob_area.append("g")
            .attr("transform", `translate(${this.knob_center_x}, ${this.knob_center_y})`); // Center the knob

        this.knob.append("circle")
            .attr("r", this.knob_radius)
            .attr("fill", "silver")
            .attr("stroke", "#999")
            .attr("stroke-width", 2);

        this.knob.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", -this.knob_radius)
            .attr("stroke", "white")
            .attr("stroke-width", 5)
            .style("cursor", "grabbing");
        this.knob.call(d3.drag().on("drag", this.onDrag));


        this.values.forEach((v, index) => {
            let angle = (this.angles[index] - 90) * Math.PI / 180;
            let x = this.knob_center_x + this.knob_dots_center_radius * Math.cos(angle);
            let y = this.knob_center_y + this.knob_dots_center_radius * Math.sin(angle);
            this.label_area = this.knob_area.append("g")
            /*this.label_area.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 5)
                .attr("fill", "black")
                .attr("opacity", 1)
                .style("cursor", "grabbing");*/

             this.label_area.append("line")
                .attr("x1", this.knob_center_x + this.knob_dots_center_radius * Math.cos(angle))
                .attr("y1", this.knob_center_x + this.knob_dots_center_radius * Math.sin(angle))
                .attr("x2", this.knob_center_x + (10 + this.knob_dots_center_radius) * Math.cos(angle))
                .attr("y2", this.knob_center_y + (10 + this.knob_dots_center_radius) * Math.sin(angle))
                .attr("stroke", "black")
                .attr("stroke-width", 3)
                .style("cursor", "grabbing");



            x = this.knob_center_x + this.knob_labels_center_radius * Math.cos(angle);
            y = this.knob_center_y + this.knob_labels_center_radius * Math.sin(angle);
            this.label_area.append("text")
                .attr("x", x)
                .attr("y", y)
                .attr("font-size", 12)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-family", "Menlo, monospace")  // Set font to Menlo
                .attr("fill", "black")
                .style("cursor", "grabbing")
                .text(v);
            this.label_area.on("click", () => {
                // Set the knob to the clicked sigma value
                index = this.values.indexOf(v);
                this.current_value = this.values[index];
                this.knob.transition()
                    .duration(100)
                    .ease(d3.easeCubicInOut)
                    .attr("transform", `translate(${this.knob_center_x}, ${this.knob_center_y}) rotate(${this.angles[index]})`);
                this.call_back();
            }
            );
        });

        this.knob.call(d3.drag().on("drag", (event) => {
            // Get mouse position relative to the SVG
            const mousePos = d3.pointer(event);
            // Since the knob is centered at (100, 100), we subtract that to get position relative to the knob's center
            const x = mousePos[0] - this.knob_center_x - this.knob_area.node().getBoundingClientRect().x;
            const y = mousePos[1] - this.knob_center_y - this.knob_area.node().getBoundingClientRect().y;
            // Calculate the angle relative to the center of the knob
            let angle = Math.atan2(y, x) * (180 / Math.PI);  // Convert radians to degrees
            angle = (Math.round((angle + 90) / this.angleStep) * this.angleStep) % 360;
            const index = Math.round(angle / this.angleStep);
            this.current_value = this.values[index];
            // Apply the angle to rotate the knob
            this.knob.attr("transform", `translate(${this.knob_center_x}, ${this.knob_center_y}) rotate(${angle})`); // Adding 90 to adjust the starting angle
            /*this.knob.transition()  // Apply transition for smooth animation
                .duration(1000)  // Duration of the transition (in milliseconds)
                .ease(d3.easeCubicInOut)  // Smooth easing function
                .attr("transform", `translate(${this.knob_center_x}, ${this.knob_center_y}) rotate(${angle})`);
*/
            this.call_back();

        }));
    }

    get_current_value() {
        return this.current_value;
    }
}

export class Line {
    constructor(svg, env) {
        this.line = svg.append("line")
            .attr("x1", 100)
            .attr("y1", 100)
            .attr("x2", 200)
            .attr("y2", 200)
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("transform", `translate(${env.get_window_left_margin()},${env.get_window_top_margin()})`);
    }
    set_position(x1, y1, x2, y2) {
        this.line
            .attr("x1", x1)
            .attr("x2", x2)
            .attr("y1", y1)
            .attr("y2", y2);
    }
    set_color(color) {
        this.line.attr("stroke", color);
    }
}

export class TextRect {
    constructor(svg, name, fill) {
        this.name = name;
        //this.group = svg.append("g");
        this.rect_element = svg.append("rect")
            .attr("id", this.name + "-label-bg")
            .attr("width", 50)
            .attr("height", 20)
            .attr("fill", fill)
            .attr("rx", 5)
            .attr("ry", 5);
        this.text_element = svg.append("text")
            .attr("id", this.name + "-label-text")
            .attr("fill", "yellow")
            .attr("color", "white")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .style("font-size", "12px")
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .style("font-weight", "bold");
        this.hide();
    }
    set_rect_border_color(color) {
        console.log("set_rect_border_color");
        this.rect_element.attr("stroke", color);
        this.rect_element.attr("stroke-width", 2);
    }
    set_width(width) {
        this.rect_element.attr("width", width);
    }
    get_width() {
        return this.rect_element.attr("width");
    }
    set_height(height) {
        this.rect_element.attr("height", height);
    }
    set_text(text) {
        this.text_element.text(text);
    }
    set_rect_position(x, y) {
        this.rect_element.attr("transform", `translate(${x}, ${y})`);
    }
    set_text_position(x, y) {
        this.text_element.attr("transform", `translate(${x}, ${y})`);
        //this.text_element.attr("x", x).attr("y", y);
    }
    set_text_color(color) {
        this.text_element.attr("fill", color);
    }
    show() {
        this.text_element.style("visibility", "visible");
        this.rect_element.style("visibility", "visible");
    }
    hide() {
        this.text_element.style("visibility", "hidden");
        this.rect_element.style("visibility", "hidden");
    }
}

class Cursor {

    constructor(svg, data, yscale, name, fill) {
        this.data = data;
        this.name = name;
        this.yscale = yscale;
        this.fill = fill;

        this.textRect = new TextRect(svg, name, fill);
        this.textRect.hide();
    }

    set_position(x, y) {
        //console.log("get_width()=",this.textRect.get_width());
        this.textRect.set_rect_position(x, y);
        this.textRect.set_text_position(x + this.textRect.get_width() / 2, y);
    }

    set_text(text) {
        this.textRect.set_text(text);
    }

    set_text_color(color) {
        this.textRect.text_element.attr("fill", color);
    }

    show() {
        this.textRect.show();
    }

    hide() {
        this.textRect.hide();
    }


}

export class HorizontalCursor extends Cursor {

    constructor(svg, data, xscale, name, fill) {
        super(svg, data, xscale, name, fill); // Call the parent class constructor
        this.svg = svg;
        this.vpos=0;
    }
    set_vpos(vpos) {
        this.vpos = vpos;
    }
    update(env, x) {

        const price = env.get_x_scale().invert(x - env.get_window_left_margin());
        const formattedPrice = price.toFixed(0); // Format as %.1f

        this.xscale = env.get_x_scale();

        this.set_position(
            x - 25,
            this.vpos);
//            env.get_window_height() - env.get_window_bottom_margin() - env.get_window_bottom_margin() + 4);
        this.set_text(formattedPrice);

        //this.textRect.rect_element.attr("transform", `translate(${x - 25}, ${env.get_window_height() - env.get_window_bottom_margin() + 4})`);
        //this.textRect.text_element.attr("transform", `translate(${x - 25}, ${env.get_window_height() - env.get_window_bottom_margin() + 4})`);
        //this.textRect.text_element.select("#" + this.name + "-label-text")
        //    .attr("x", 25)
        //    .text(formattedPrice);
        return;


    }

}

export class VerticalCursor extends Cursor {

    constructor(svg, data, yscale, name, fill) {
        super(svg, data, yscale, name, fill); // Call the parent class constructor
        this.svg = svg;
    }

    update(env, price) {

        this.xscale = env.get_x_scale();

        let nearestPoint = getNearestYValue(this.data, price);
        let p_and_l_value = nearestPoint.y;

        this.set_position(
            env.get_window_left_margin() - 50,
            env.get_window_top_margin() + this.yscale(p_and_l_value) - 10);
        this.set_text(p_and_l_value.toFixed(0));

        this.svg.select("#" + this.name + "-hline").remove();
        this.svg.append("line")
            .attr("class", "crosshair-line")
            .attr("id", this.name + "-hline")
            .attr("x1", env.get_window_left_margin())
            .attr("x2", env.get_window_left_margin() + this.xscale(price))
            .attr("y1", this.yscale(p_and_l_value) + env.get_window_top_margin())
            .attr("y2", this.yscale(p_and_l_value) + env.get_window_top_margin())
            .attr("stroke", this.fill)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4");

        this.svg.select("#" + this.name + "-dot-y").remove();
        this.svg.append("circle")
            .attr("id", this.name + "-dot-y")
            .attr("cx", this.xscale(price) + env.get_window_left_margin())
            .attr("cy", this.yscale(p_and_l_value) + env.get_window_top_margin())
            .attr("r", 4) // Radius 4
            .attr("fill", this.fill);

    }

}

