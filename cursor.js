function getNearestYValue(data, xValue) {
    const nearestPoint = data.reduce((prev, curr) =>
        Math.abs(curr.x - xValue) < Math.abs(prev.x - xValue) ? curr : prev
    );
    return nearestPoint;
}

export class Cursor {

    constructor(svg, data, yscale, name, fill) {
        this.data = data;
        this.name = name;
        this.yscale = yscale;
        this.fill = fill;

        this.group = svg.append("g");
        this.group.append("rect")
            .attr("id", this.name + "-label-bg")
            .attr("width", 50)
            .attr("height", 20)
            .attr("fill", this.fill)
            .attr("rx", 5)
            .attr("ry", 5);
        this.group.append("text")
            .attr("id", this.name + "-label-text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .style("font-size", "12px")
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .style("font-weight", "bold");
    }

    update(env, price) {

        this.xscale = env.get_x_scale();

        let nearestPoint = getNearestYValue(this.data, price);
        let p_and_l_value = nearestPoint.y;
        
        this.group.attr("transform", `translate(${env.get_window_left_margin() - 50}, ${env.get_window_top_margin() + this.yscale(p_and_l_value)})`);
        
        this.group.select("#"+ this.name + "-label-bg")
            .attr("x", 0)
            .attr("y", -10);

        this.group.select("#"+ this.name + "-label-text")
            .attr("x", 25)
            .attr("y", -10)
            .text(p_and_l_value.toFixed(0));

        this.group.select("#"+ this.name + "-hline").remove();
        this.group.append("line")
            .attr("class", "crosshair-line")
            .attr("id", this.name + "-hline")
            .attr("x1", 50)
            .attr("x2", 50 + this.xscale(price))
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("stroke", this.fill)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4");

        this.group.select("#"+this.name + "-dot-y").remove();
        this.group.append("circle")
            .attr("id", this.name + "-dot-y")
            .attr("cx", this.xscale(price) + 50)
            .attr("cy", 0)
            .attr("r", 4) // Radius 4
            .attr("fill", this.fill);

    }
    show() {
        this.group.style("visibility", "visible");
    }

    hide() {
        this.group.style("visibility", "hidden");
    }


}

