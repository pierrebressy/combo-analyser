function getNearestYValue(data, xValue) {
    const nearestPoint = data.reduce((prev, curr) =>
        Math.abs(curr.x - xValue) < Math.abs(prev.x - xValue) ? curr : prev
    );
    return nearestPoint;
}
export class Line {
    constructor(svg, env) {
        this.line=svg.append("line")
            .attr("x1", 100)
            .attr("y1", 100)
            .attr("x2", 200)
            .attr("y2", 200)
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("transform", `translate(${env.get_window_left_margin()},${env.get_window_top_margin()})`);
    }
    set_position(x1,y1,x2,y2) {
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
    }

    update(env, x) {

        const price = env.get_x_scale().invert(x - env.get_window_left_margin());
        const formattedPrice = price.toFixed(0); // Format as %.1f

        this.xscale = env.get_x_scale();

        this.set_position(
            x - 25,
            env.get_window_height() - env.get_window_bottom_margin() + 4);
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

