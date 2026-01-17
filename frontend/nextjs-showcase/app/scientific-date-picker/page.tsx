'use client';

import { useEffect } from 'react';

export default function ScientificDatePicker() {
  useEffect(() => {
    /*
      The formula I use is not the scientifically best formula.
      If you want more correct result use Kepler's laws.
      Also I use center of circumcircle of ellipse because
      orbit of the earth is not too much ellipse, it's almost a circle
      and Sun is almost in the middle of the circle, you can use center of ellipse
    */

    const earth = document.getElementById("earth") as HTMLImageElement;
    const dateButton = document.getElementById("date") as HTMLButtonElement;
    const datePicker = document.getElementById("datePicker") as HTMLDivElement;
    const ellipse = document.getElementById("ellipse") as SVGEllipseElement;

    let isPressing = false;

    const earthSize = 15;
    const horizontalRadius = 150;
    const verticalRadius = 73;
    const horizontalMargin = 25;
    const verticalMargin = 10;

    let today = new Date();
    let year = today.getFullYear();
    let start = new Date(today.getFullYear(), 0, 0);
    let diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    let dayNumber = Math.floor(diff / oneDay);
    let date = dateFromDay(dayNumber);
    dateButton.children[0].innerHTML = addZero(date.getDate()) + "/" + addZero(date.getMonth()+1) + "/" + year;

    let angle = 2*Math.asin(((dayNumber-1)/(182.5 + (isLeapyear()?0.5:0)))-1);
    let previousAngle = angle;
    let x = horizontalRadius*Math.cos(angle);
    let y = verticalRadius*Math.sin(angle);

    earth.setAttribute("x", String(horizontalRadius + x - earthSize/2 + horizontalMargin));
    earth.setAttribute("y", String(verticalRadius - y - earthSize/2 + verticalMargin));

    earth.addEventListener("mousedown", mousedown);
    earth.addEventListener("touchstart", mousedown);

    addEventListener("mousemove", mousemove);
    addEventListener("touchmove", mousemove);

    addEventListener("mouseup", mouseup);
    addEventListener("touchend", mouseup);

    const dateButtonRect = dateButton.getBoundingClientRect();
    datePicker.style.top = dateButtonRect.height + "px";
    datePicker.style.right = "0";
    dateButton.style.height = dateButtonRect.height + "px";

    function mousedown(e: MouseEvent | TouchEvent) {
      isPressing = true;
    }

    function mousemove(e: MouseEvent | TouchEvent) {
      if(!isPressing)
        return;

      const { clientX, clientY } = (e as TouchEvent).touches != null ? (e as TouchEvent).touches[0] : e as MouseEvent;

      const rect = ellipse.getBoundingClientRect();
      const ellipseCenterX = rect.x + rect.width/2 + horizontalMargin;
      const ellipseCenterY = rect.y + rect.height/2 + verticalMargin;
      angle = Math.atan2(ellipseCenterY - clientY, clientX - ellipseCenterX);

      // Detect full rotations by checking angle transitions
      const angleDiff = angle - previousAngle;

      // Detect crossing from right side (near π) to left side (near -π) - going backward in time
      if (angleDiff > Math.PI) {
        year--;
      }
      // Detect crossing from left side (near -π) to right side (near π) - going forward in time
      else if (angleDiff < -Math.PI) {
        year++;
      }

      previousAngle = angle;

      let x = horizontalRadius*Math.cos(angle);
      let y = verticalRadius*Math.sin(angle);

      earth.setAttribute("x", String(horizontalRadius + x - earthSize/2 + horizontalMargin));
      earth.setAttribute("y", String(verticalRadius - y - earthSize/2 + verticalMargin));

      dayNumber = ((182.5 + (isLeapyear()?0.5:0))*(Math.sin((angle)/2) + 1) + 1);

      date = dateFromDay(dayNumber);

      // Prevent going to the future or past 1950
      if(date.getTime() > today.getTime() || year < 1950){
        (dateButton.children[0] as HTMLElement).classList.add("future");
        if(year < 1950){
          year = 1950;
          (dateButton.children[0] as HTMLElement).innerHTML = "Can't go before 1950!";
        }else{
          (dateButton.children[0] as HTMLElement).innerHTML = "Fuck you Kyle Reese"; // We don't like time travelers!
        }
      }else{
        (dateButton.children[0] as HTMLElement).classList.remove("future");
        (dateButton.children[0] as HTMLElement).innerHTML = addZero(date.getDate()) + "/" + addZero(date.getMonth() + 1) + "/" + year;
      }
    }

    function dateFromDay(day: number){
      const date = new Date(year, 0);
      return new Date(date.setDate(day));
    }

    function mouseup(e: MouseEvent | TouchEvent) {
      isPressing = false;
    }

    function addZero(num: number){
      return num<10?"0"+num:num;
    }

    function isLeapyear(){
      return (year % 100 === 0) ? (year % 400 === 0) : (year % 4 === 0);
    }

    return () => {
      earth.removeEventListener("mousedown", mousedown);
      earth.removeEventListener("touchstart", mousedown);
      removeEventListener("mousemove", mousemove);
      removeEventListener("touchmove", mousemove);
      removeEventListener("mouseup", mouseup);
      removeEventListener("touchend", mouseup);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        html, body {
          height: 100%;
        }

        body {
          margin: 0;
          display: flex;
          flex-flow: column;
          align-items: center;
          justify-content: center;
          background: #464646;
          font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          gap: 1rem;
        }

        h1 {
          color: #fff;
          font-size: 4rem;
          font-weight: 300;
          margin: 0;
        }

        h2 {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 300;
          margin: 0;
        }

        input {
          outline: 0;
          border: none;
          border-bottom: 1px solid #fff;
          border-radius: 0;
          background: transparent;
          width: 220px;
          padding: 0;
          color: #fff;
          -webkit-text-fill-color: #fff;
          opacity: 1;
        }

        #signupArea {
          display: flex;
          flex-direction: column;
        }

        #signupArea > *{
          margin-top: 15px;
        }

        #signupArea > div {
          display: flex;
          justify-content: space-between;
        }

        #datePicker {
          display: flex;
          gap: 1rem;
          width: 75vw;
          max-width: 400px;
          position: absolute;
          z-index: 99;

          background-color: black;
          border-radius: 60px 0px 60px 60px;

          clip-path: circle(0% at 100% 0%);
          transition: clip-path 0.7s;

          cursor: grab;
        }

        svg {
          width: 100%;
        }

        button {

          border: none;
          background: #fff;
          color: #464646;
          border-radius: 0.3rem;
          padding: 0.5rem;
          cursor: pointer;
          position: relative;
        }

        #date {
          width: 50%;
          max-width: 50%;
        }

        #date input{
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          margin:0;
          border: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
        }

        .future{
          color: red;
          font-size: 0.6rem;
        }

        #date input:checked ~ #datePicker{
          clip-path: circle(150% at 100% 100%);
        }

        input, button {
          font: inherit;
        }
      `}</style>

      <h1>Sign Up</h1>
      <div id="signupArea">
        <h2>Name</h2>
        <input />
        <h2>Password</h2>
        <input type="password" />
        <div>
          <h2>Date of Birth</h2>
          <button id="date">
            <div></div>
            <input type="checkbox" />
            <div id="datePicker">
              <svg viewBox="0 0 350 166">
                <ellipse id="ellipse" cx="175" cy="83" rx="150" ry="73"
                style={{fillOpacity: 0, stroke: 'yellow', strokeWidth: 0.5}} />
                <image id="earth" height="15" width="15" href="/earth.png"></image>
                <image id="sun" x="105" y="68" height="30" width="30" href="/sun.png"></image>
              </svg>
            </div>
          </button>
        </div>
        <button onClick={() => window.location.reload()}>SIGN UP</button>
      </div>
    </>
  );
}
