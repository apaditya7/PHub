'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LimitUsername() {
  useEffect(() => {
    const input = document.getElementById('userNameInput') as HTMLInputElement;
    if (!input) return;

    const y = input.getBoundingClientRect().top + 10;
    const x = input.getBoundingClientRect().left + 150;

    const mainDiv = document.getElementById('main')!;
    const fallingDivs: HTMLDivElement[] = [];

    const handleInput = () => {
      while(isOverflown(input)){
        let fallingChar = input.value.substr(-1);
        input.value = input.value.slice(0,-1);

        let fallingDiv = document.createElement('div');
        fallingDiv.innerText = fallingChar;

        fallingDiv.classList.add('fallingDiv');
        fallingDiv.style.top = y +'px';
        fallingDiv.style.left = x + 'px';
        fallingDiv.style.transform = 'rotate(0deg)';

        mainDiv.append(fallingDiv);
        fallingDivs.push(fallingDiv);
      }
    };

    input.addEventListener('input', handleInput);

    function isOverflown(element: HTMLElement) {
      return element.scrollWidth > element.clientWidth;
    }

    const interval = setInterval(() => {
      fallingDivs.forEach(fallingDiv => {
        if(Number(fallingDiv.style.top.slice(0,-2)) < document.getElementById('bin')!.getBoundingClientRect().top + 10){
          fallingDiv.style.top = Number(fallingDiv.style.top.slice(0,-2)) + 5 + 'px';
          fallingDiv.style.transform = 'rotate(' + (Number(fallingDiv.style.transform.slice(7,fallingDiv.style.transform.indexOf('d')))+5)+'deg)';
        }
      });
    }, 40);

    return () => {
      input.removeEventListener('input', handleInput);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          box-sizing: border-box;
          font-family: sans-serif;
        }

        input {
          height: 30px;
          width: 150px;
          outline: 0;
          border-radius: 15px;
          margin-left: 10px;
          padding: 0 10px;
        }

        #userNameInput {
          border-right: 0;
          border-bottom-right-radius: 0;
          border-top-right-radius: 0;
          padding-right: 0;
        }

        button {
          width: 75px;
          border-radius: 25px;
          cursor: pointer;
        }

        button, input {
          outline: 0;
        }

        #main {
          margin: 20px;
          height: 350px;
          display: flex;
          flex-direction: column;
        }

        .itemDiv {
          display: flex;
          width: 150px;
          margin-top: 10px;
          justify-content: center;
        }

        .fallingDiv {
          position: absolute;
          height: 20px;
          font-size: 13.3333px;
          transform: rotate(0deg);
        }

        #bin {
          width: 150px;
          height: 180px;
          position: relative;
          margin-top: 20px;
          left: 100px;
          z-index: 5;
        }

        .back-link {
          position: absolute;
          top: 20px;
          right: 20px;
          color: blue;
          text-decoration: underline;
          z-index: 1000;
        }
      `}</style>

      <Link href="/" className="back-link">← Back to Home</Link>

      <div id="main">
        <div className="itemDiv">
          <input id="userNameInput" placeholder="Username"/>
        </div>
        <div className="itemDiv">
          <input type="password" placeholder="Password"/>
        </div>
        <div className="itemDiv">
          <button>Sign Up</button>
        </div>
        <img id="bin" src="/bin.png" alt="trash bin"/>
      </div>
    </>
  );
}
