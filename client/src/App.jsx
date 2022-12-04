import ReactDOM from "react-dom";
import React, { Component } from "react";

const withdraw = (total, amount) => {
  total -= amount;
  console.log(total);
};

function tick() {
  const element = (
    <div>
      <h1>Hello, world!</h1>
      <h2>It is {new Date().toLocaleTimeString()}.</h2>
    </div>
  );
  var total = 200;
  const amount = 20;
  console.log(total);
  withdraw(total, amount);
  // console.log(total);
  // ReactDOM.render(element, document.getElementById("root"));
}

// setInterval(tick, 1000);

function App() {
  return <div></div>;
}

export default App;
