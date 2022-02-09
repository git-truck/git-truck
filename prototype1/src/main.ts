import "./style.css";
import * as d3 from "d3";
import { data } from "./data";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div id="diagram"></div>
`

const svg =
  d3.select("#diagram")
  .append("svg")
