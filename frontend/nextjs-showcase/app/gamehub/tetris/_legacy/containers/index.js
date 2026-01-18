import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import propTypes from 'prop-types';

import style from './index.module.css';

import Matrix from '../components/matrix';
import Decorate from '../components/decorate';
import Number from '../components/number';
import Next from '../components/next';
import Music from '../components/music';
import Pause from '../components/pause';
import Point from '../components/point';
import Logo from '../components/logo';
import Keyboard from '../components/keyboard';
import Guide from '../components/guide';

import { transform, lastRecord, speeds, i18n, lan } from '../unit/const';
import { visibilityChangeEvent, isFocus, subscribeRecord } from '../unit/index';
import states from '../control/states';
import { startControl, stopControl } from '../control';
import store from '../store';

const App = (props) => {
  const [w, setW] = useState(640);
  const [h, setH] = useState(960);

  const resize = () => {
    setW(document.documentElement.clientWidth);
    setH(document.documentElement.clientHeight);
  };

  useEffect(() => {
    // Initial setup
    resize();
    window.addEventListener('resize', resize, true);
    startControl();
    
    // Subscribe to store updates for recording state
    const unsubscribe = subscribeRecord(store);

    // Visibility change
    const onVisibilityChange = () => {
      states.focus(isFocus());
    };
    
    if (visibilityChangeEvent) {
      document.addEventListener(visibilityChangeEvent, onVisibilityChange, false);
    }

    // Last record logic
    // We use the imported lastRecord which captures state at load time.
    // Ideally we should re-read it, but for compatibility we keep it.
    if (lastRecord) {
      if (lastRecord.cur && !lastRecord.pause) {
        const speedRun = props.speedRun;
        let timeout = speeds[speedRun - 1] / 2;
        timeout = speedRun < speeds[speeds.length - 1] ? speeds[speeds.length - 1] : speedRun;
        states.auto(timeout);
      }
      if (!lastRecord.cur) {
        states.overStart();
      }
    } else {
      states.overStart();
    }

    return () => {
      window.removeEventListener('resize', resize, true);
      stopControl();
      unsubscribe();
      if (visibilityChangeEvent) {
        document.removeEventListener(visibilityChangeEvent, onVisibilityChange, false);
      }
    };
  }, []); // Run once on mount

  let filling = 0;
  const size = (() => {
    const ratio = h / w;
    let scale;
    let css = {};
    if (ratio < 1.5) {
      scale = h / 960;
    } else {
      scale = w / 640;
      filling = (h - (960 * scale)) / scale / 3;
      css = {
        paddingTop: Math.floor(filling) + 42,
        paddingBottom: Math.floor(filling),
        marginTop: Math.floor(-480 - (filling * 1.5)),
      };
    }
    css[transform] = `scale(${scale})`;
    return css;
  })();

  return (
    <div
      className={style.app}
      style={size}
    >
      <div className={classnames({ [style.rect]: true, [style.drop]: props.drop })}>
        <Decorate />
        <div className={style.screen}>
          <div className={style.panel}>
            <Matrix
              matrix={props.matrix}
              cur={props.cur}
              reset={props.reset}
            />
            <Logo cur={!!props.cur} reset={props.reset} />
            <div className={style.state}>
              <Point cur={!!props.cur} point={props.points} max={props.max} />
              <p>{ props.cur ? i18n.cleans[lan] : i18n.startLine[lan] }</p>
              <Number number={props.cur ? props.clearLines : props.startLines} />
              <p>{i18n.level[lan]}</p>
              <Number
                number={props.cur ? props.speedRun : props.speedStart}
                length={1}
              />
              <p>{i18n.next[lan]}</p>
              <Next data={props.next} />
              <div className={style.bottom}>
                <Music data={props.music} />
                <Pause data={props.pause} />
                <Number time />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Keyboard filling={filling} keyboard={props.keyboard} />
      <Guide />
    </div>
  );
};

App.propTypes = {
  music: propTypes.bool.isRequired,
  pause: propTypes.bool.isRequired,
  matrix: propTypes.object.isRequired,
  next: propTypes.string.isRequired,
  cur: propTypes.object,
  dispatch: propTypes.func.isRequired,
  speedStart: propTypes.number.isRequired,
  speedRun: propTypes.number.isRequired,
  startLines: propTypes.number.isRequired,
  clearLines: propTypes.number.isRequired,
  points: propTypes.number.isRequired,
  max: propTypes.number.isRequired,
  reset: propTypes.bool.isRequired,
  drop: propTypes.bool.isRequired,
  keyboard: propTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  pause: state.get('pause'),
  music: state.get('music'),
  matrix: state.get('matrix'),
  next: state.get('next'),
  cur: state.get('cur'),
  speedStart: state.get('speedStart'),
  speedRun: state.get('speedRun'),
  startLines: state.get('startLines'),
  clearLines: state.get('clearLines'),
  points: state.get('points'),
  max: state.get('max'),
  reset: state.get('reset'),
  drop: state.get('drop'),
  keyboard: state.get('keyboard'),
});

export default connect(mapStateToProps)(App);
