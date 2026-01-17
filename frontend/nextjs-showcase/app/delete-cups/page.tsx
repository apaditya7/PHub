'use client';

import { useEffect } from 'react';

export default function DeleteCups() {
  useEffect(() => {
    // Helper function - same as original $()
    function $(element: string): any {
      if (document.querySelectorAll(element).length !== 1) {
        return document.querySelectorAll(element);
      } else {
        return document.querySelector(element);
      }
    }

    /*
    =======
    alert patch
    =======
    */
    const customAlert = function(msg: string) {
      $(".alert").classList.remove("hide");
      $(".alert h1").innerHTML = msg;
      setTimeout(function() {
        $(".alert").classList.add("hide");
      }, 2500);
    };

    /*
    =======
    array shuffle
    =======
    */
    function array_shuffle(inp: number[]) {
      let tmp = [...inp];
      let out: number[] = [];

      while(out.length !== inp.length) {
        let el = tmp[Math.floor(Math.random() * tmp.length)];
        out.push(el);
        tmp = tmp.filter((s => s !== el));
      }

      return out;
    }

    /*
    =======
    cups shuffling
    =======
    */
    function cups_shuffle() {
      $("button").classList.add("fadeout");
      $("button").style.bottom = "0px";

      setTimeout(function() {
        let index = 0;
        array_shuffle([0, 128, 256]).forEach((left: number) => {
          $(".cup")[index].style.left = left + "px";
          index++;
        });
      }, 400);
    }

    /*
    =======
    loop cups_shuffle
    =======
    */
    function shuffle_loop(times: number) {
      // add shuffling class so the cups can't be opened mid-shuffle
      $(".cup").forEach((cup: HTMLElement) => {
        cup.classList.add("shuffling");
      });

      let elapsed = 0;
      let x = setInterval(function() {
        cups_shuffle();
        elapsed++;

        if(elapsed == times) {
          // done
          clearInterval(x);

          // remove the class we added earlier
          $(".cup").forEach((cup: HTMLElement) => {
            cup.classList.remove("shuffling");
          });
        }
      }, 700);
    }

    /*
    =======
    reveal cups
    =======
    */
    $(".cup").forEach((cup: HTMLElement) => {
      cup.addEventListener("click", () => {
        if(cup.classList.contains("shuffling")) return;
        cup.style.top = "-50px";

        if(!cup.querySelector("button")) {
          // wrong cup
          customAlert("Wrong cup. Try again.");
          setTimeout(function() {
            location.reload();
          }, 1000);
        } else {
          ($("button") as HTMLElement).style.bottom = "-30px";
          $("button").classList.remove("fadeout");
        }

        setTimeout(function() {
          cup.style.top = "0px";
          ($("button") as HTMLElement).style.bottom = "0px";
          $("button").classList.add("fadeout");
        }, 2500);
      });
    });

    /*
    =======
    delete account button react
    =======
    */
    $("button").addEventListener("click", () => {
      if(document.querySelector(".cup.shuffling")) return;

      customAlert("Thank you for submitting your request.");
      setTimeout(function() {
        $(".cups_container").classList.add("hide");
      }, 2500);
    });

    /*
    =======
    start shuffle_loop
    =======
    */
    setTimeout(function() {
      shuffle_loop(Math.floor(Math.random() * 10) + 4);
    }, 250);
  }, []);

  return (
    <>
      <div className="center main">
        <h1>Remove your account</h1>
        <p>To confirm, click the <code>DELETE</code> button.<br />This decision is final.</p>
        <div className="box">
          <div className="cups_container center">
            <div className="cup shuffling" style={{left: '0px', top: '0px'}}></div>
            <div className="cup shuffling" style={{left: '128px', top: '0px'}}>
              <button style={{bottom: '-30px'}}>Delete</button>
            </div>
            <div className="cup shuffling" style={{left: '256px', top: '0px'}}></div>
          </div>
        </div>
      </div>

      <div className="center hide alert">
        <h1></h1>
      </div>

      <style jsx global>{`
        body {
          background: white;
          color: black;
          font-family: sans-serif;
          user-select: none;
          overflow: hidden;
        }
        * {
          margin: 0px 0px;
          font-weight: 200;
        }

        .hide {
          display: none;
        }

        .alert {
          background: black;
          color: white;
          border: 1px #cbcbcb solid;
          border-radius: 7.5px;
          padding: 15px 15px;
        }

        .center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .main {
          border: 1px black solid;
          border-radius: 7.5px;
          padding: 10px 10px;
        }

        .box {
          margin-top: 15px;
          width: 400px;
          height: 400px;
          overflow: hidden;
        }

        button {
          background: white;
          border: 1px black solid;
          border-radius: 5px;
          margin-top: 15px;
          outline: none;
          padding: 5px 5px;
          color: black;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          transition: all 0.3s;
          z-index: -1;
        }

        .cup {
          background-image: url("/delete-cups/cup.png");
          width: 128px;
          height: 128px;
          position: absolute;
          transition: all 0.3s;
        }

        .cups_container {
          width: 384px;
          top: 40%;
        }

        .fadeout {
          opacity: 0;
        }
      `}</style>
    </>
  );
}
