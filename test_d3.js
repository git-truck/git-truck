import * as d3 from "d3"
const data = [{countLogged: 1}, {countLogged: 2}]
console.log(d3.max(data, d => d.countLogged))
