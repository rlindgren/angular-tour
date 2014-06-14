/**
 * An AngularJS directive for showcasing features of your website. Adapted from DaftMonk @ https://github.com/DaftMonk/angular-tour
 * @version v0.1.49 - 2014-06-13
 * @link https://github.com/DaftMonk/angular-tour
 * @author Ryan Lindgren
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

(function (window, document, undefined) {
  'use strict';
  angular.module('angular-tour', ['angular-tour.tour']);
  angular.module('angular-tour.tour', ['jquery-ui.scrollParent']).constant('tourConfig', {
    placement: 'top',
    animation: true,
    nextLabel: 'Next',
    backLabel: 'Back',
    finishLabel: 'Finish',
    scrollSpeed: 500,
    offset: 10,
    appendToBody: false,
    delay: 0
  }).controller('TourController', [
    '$scope',
    '$rootScope',
    '$attrs',
    '$parse',
    'tourtipMap',
    function ($scope, $rootScope, $attrs, $parse, tourtipMap) {
      var self = this;
      var model = $parse($attrs.step);
      self.postTourCallback = $attrs.postTour || 'angular.noop()';
      self.postStepCallback = $attrs.postStep || 'angular.noop()';
      self.currentIndex = 0;
      self.newList = function () {
        if ($scope.tourActive)
          self.cancelTour();
        self.steps = tourtipMap();
      };
      self.newList();
      self.currentStep = self.steps.get(0);
      self.select = function (step) {
        if (!step) {
          return;
        }
        self.unselectAllSteps();
        if (self.currentStep)
          $scope.$parent.$eval(self.currentStep.ttPostStep);
        self.currentStep = step;
        self.currentIndex = step.index;
        $scope.$parent.$eval(self.currentStep.ttPreStep);
        step.open();
      };
      self.addStep = function (step) {
        if (angular.isNumber(step.index) && !isNaN(step.index)) {
          self.steps.set(step.index, step);
        }
      };
      self.unselectAllSteps = function () {
        self.steps.forEach(function (step) {
          step.close();
        });
      };
      self.cancelTour = function () {
        self.unselectAllSteps();
        if (self.currentStep)
          $scope.$parent.$eval(self.currentStep.ttPostStep);
        self.postStepCallback();
        self.postTourCallback();
        self.currentIndex = 0;
        self.currentStep = null;
        $scope.tourActive = false;
      };
      self.setStep = function (step) {
        model.assign($scope.$parent, step.index);
        self.select(step);
      };
      $rootScope.openTour = function () {
        console.log(self.steps);
        var step = self.steps.get(0);
        if (step) {
          self.setStep(step);
          $scope.tourActive = true;
        }
      };
      $rootScope.closeTour = function () {
        self.cancelTour();
      };
      $rootScope.ttNextStep = function (val) {
        val = (val || self.currentIndex) + 1;
        if (val >= self.steps.getCount()) {
          self.cancelTour();
          return;
        }
        var step = self.steps.get(val);
        if (!step) {
          $rootScope.ttNextStep(val);
        } else {
          self.setStep(step);
        }
      };
      $rootScope.ttPrevStep = function (val) {
        val = (val || self.currentIndex) - 1;
        if (val < 0) {
          self.cancelTour();
          return;
        }
        var step = self.steps.get(val);
        if (!step) {
          $rootScope.ttPrevStep(val);
        } else {
          self.setStep(step);
        }
      };
    }
  ]).directive('tour', [
    '$rootScope',
    function ($rootScope) {
      return {
        controller: 'TourController',
        restrict: 'EA',
        scope: true,
        link: function (scope, element, attrs, ctrl) {
          if (!angular.isDefined(attrs.step)) {
            throw 'The <tour> directive requires a `step` attribute to bind the current step to.';
          }
          scope.$on(attrs.rebuildOn ? attrs.rebuildOn : '$locationChangeStart', function () {
            ctrl.newList();
          });
          ctrl.postTourCallback = function () {
            scope.$parent.$eval(attrs.postTour || 'angular.noop()');
          };
          ctrl.postStepCallback = function () {
            scope.$parent.$eval(attrs.postStep || 'angular.noop()');
          };
          scope.setNextStep = function (ev) {
            if (ev) {
              ev.preventDefault();
              ev.stopImmediatePropagation();
            }
            $rootScope.ttNextStep();
          };
          scope.setPrevStep = function (ev) {
            if (ev) {
              ev.preventDefault();
              ev.stopImmediatePropagation();
            }
            $rootScope.ttPrevStep();
          };
        }
      };
    }
  ]).directive('tourtip', [
    '$window',
    '$compile',
    '$parse',
    '$timeout',
    '$sce',
    'scrollTo',
    'tourConfig',
    function ($window, $compile, $parse, $timeout, $sce, scrollTo, tourConfig) {
      var template = '<div tour-popup></div>';
      return {
        require: '^tour',
        restrict: 'EA',
        scope: true,
        compile: function (EL, ATTRS) {
          var _global = angular.element($window);
          return {
            pre: function (scope, element, attrs, tourCtrl) {
              attrs.$observe('tourtip', function (val) {
                scope.ttContent = $sce.trustAsHtml(val || '');
              });
              attrs.$observe('tourtipPlacement', function (val) {
                scope.ttPlacement = val || tourConfig.placement;
              });
              attrs.$observe('tourtipAlign', function (val) {
                scope.ttAlign = 'top bottom'.match(scope.ttPlacement) ? val || 'left' : val || 'top';
              });
              attrs.$observe('tourtipNextLabel', function (val) {
                scope.ttNextLabel = $sce.trustAsHtml(val || tourConfig.nextLabel);
              });
              attrs.$observe('tourtipBackLabel', function (val) {
                scope.ttBackLabel = $sce.trustAsHtml(val || tourConfig.backLabel);
              });
              attrs.$observe('tourtipFinishLabel', function (val) {
                scope.ttFinishLabel = $sce.trustAsHtml(val || tourConfig.finishLabel);
              });
              attrs.$observe('tourtipOffset', function (val) {
                scope.ttOffset = parseInt(val, 10) || tourConfig.offset;
              });
              attrs.$observe('tourtipOffsetTop', function (val) {
                scope.ttOffsetTop = parseInt(val, 10) || 0;
              });
              attrs.$observe('tourtipOffsetLeft', function (val) {
                scope.ttOffsetLeft = parseInt(val, 10) || 0;
              });
              attrs.$observe('tourtipAppendToBody', function (val) {
                scope.ttAppendToBody = scope.$eval(val) || tourConfig.appendToBody;
              });
              attrs.$observe('tourtipPreStep', function (val) {
                scope.ttPreStep = $parse(val) || angular.noop;
              });
              attrs.$observe('tourtipPostStep', function (val) {
                scope.ttPostStep = $parse(val) || angular.noop;
              });
              attrs.$observe('tourtipDelay', function (val) {
                scope.ttDelay = parseInt(val, 10) || tourConfig.delay;
              });
              scope.index = parseInt(attrs.tourtipStep, 10);
              scope.open = function () {
                scope.ttOpen = true;
              };
              scope.close = function () {
                scope.ttOpen = false;
              };
              scope.isFirstStep = function () {
                var index = parseInt(scope.index.toString(), 10);
                var len = tourCtrl.steps.getCount();
                while (index >= 0) {
                  index -= 1;
                  if (tourCtrl.steps.get(index)) {
                    return false;
                  }
                }
                return true;
              };
              scope.isLastStep = function () {
                var index = parseInt(scope.index.toString(), 10);
                var len = tourCtrl.steps.getCount();
                while (index < len) {
                  index += 1;
                  if (tourCtrl.steps.get(index)) {
                    return false;
                  }
                }
                return true;
              };
              scope.close();
              scope.ttAnimation = tourConfig.animation;
              scope.ttOffset = tourConfig.offset;
              tourCtrl.addStep(scope);
            },
            post: function (scope, element, attrs, tourCtrl) {
              var tourtip = $compile(template)(scope);
              if (!element.height() && !element.width()) {
                element = element.parent();
              } else {
                element = element;
              }
              var $frame;
              var scrollHandler = function (e) {
                updatePosition(element, tourtip);
              };
              $timeout(function () {
                scope.$watch('ttOpen', function (val) {
                  if (val) {
                    show();
                  } else {
                    hide();
                  }
                });
              }, 500);
              var updatePosition = function (element, tourtip) {
                var atb = scope.ttAppendToBody;
                var elRect = element[0].getBoundingClientRect(), elHeight = elRect.height, elWidth = elRect.width, elTop = scope.ttAppendToBody ? elRect.top : element.offset().top, elBottom = scope.ttAppendToBody ? elRect.bottom : elTop + elHeight, elLeft = scope.ttAppendToBody ? elRect.left : element.offset().left, elRight = scope.ttAppendToBody ? elRect.right : elLeft + elWidth, ttWidth = tourtip.width(), ttHeight = tourtip.height(), ttPlacement = scope.ttPlacement, ttPosition = {}, ttAlign = scope.ttAlign, ttOffset = scope.ttOffset, arrowOffset = 14;
                var arrowCenter = 22 + arrowOffset / 2;
                // should we point directly at the element?
                var pointAt = 'left right'.match(ttPlacement) ? elHeight < arrowCenter * 2 : elWidth < arrowCenter * 2;
                switch (ttPlacement) {
                case 'right':
                case 'left':
                  if (ttAlign === 'top') {
                    if (pointAt)
                      ttPosition.top = elTop - arrowCenter / 2 + scope.ttOffsetTop;
                    else
                      ttPosition.top = elTop + scope.ttOffsetTop;
                  } else {
                    if (pointAt)
                      ttPosition.top = elBottom - ttHeight + arrowCenter / 2 + scope.ttOffsetTop;
                    else
                      ttPosition.top = elBottom - ttHeight + scope.ttOffsetTop;
                  }
                  if (ttPlacement === 'right') {
                    ttPosition.left = elRight + ttOffset + arrowOffset + scope.ttOffsetLeft;
                  } else {
                    ttPosition.left = elLeft - ttWidth - ttOffset - arrowOffset + scope.ttOffsetLeft;
                  }
                  break;
                case 'bottom':
                case 'top':
                  if (ttAlign === 'right') {
                    if (pointAt)
                      ttPosition.left = elRight - ttWidth + arrowCenter / 2 + scope.ttOffsetLeft;
                    else
                      ttPosition.left = elRight - ttWidth + scope.ttOffsetLeft;
                  } else {
                    if (pointAt)
                      ttPosition.left = elLeft - arrowCenter / 2 + scope.ttOffsetLeft;
                    else
                      ttPosition.left = elLeft + scope.ttOffsetLeft;
                  }
                  if (ttPlacement === 'top') {
                    ttPosition.top = elTop - ttHeight - ttOffset - arrowOffset + scope.ttOffsetTop;
                  } else {
                    ttPosition.top = elBottom + ttOffset + arrowOffset + scope.ttOffsetTop;
                  }
                  break;
                default:
                }
                ttPosition.top += 'px';
                ttPosition.left += 'px';
                tourtip.css(ttPosition);
              };
              function scrollFramesIntoView(el, config) {
                var parents = el.scrollParents();
                for (var i = parents.length - 2; i >= 0; i--) {
                  config.offsetTop = parseInt(window.innerHeight / (i + 3));
                  config.offsetLeft = parseInt(window.innerWidth / (i + 3));
                  scrollTo(angular.element(parents[i]).scrollParent(), parents[i], config);
                }
              }
              function show() {
                if (!scope.ttContent)
                  return;
                scope.ttFirst = scope.isFirstStep();
                scope.ttLast = scope.isLastStep();
                if (scope.ttAppendToBody) {
                  $('body').append(tourtip);
                  tourtip.css({ position: 'fixed' });
                } else {
                  element.append(tourtip);
                }
                tourtip.css({ display: 'hidden' });
                $frame = element.scrollParent();
                _global.bind('resize.' + scope.$id, scrollHandler);
                ($frame[0].tagName.match(/body/i) ? _global : $frame).bind('scroll', scrollHandler);
                var scrollConfig = { duration: tourConfig.scrollSpeed };
                var positionOffset = scope.ttPlacement === 'top' || scope.ttAlign === 'bottom' ? tourtip.height() + scope.ttOffset : scope.ttOffset;
                // scroll the frame into view if (it's not the body)
                if (!$frame[0].tagName.match(/body/i)) {
                  scrollFramesIntoView(element, scrollConfig);
                  scrollConfig.offsetTop = $frame.offset().top + $frame.height() / 3 + positionOffset + 50;
                  scrollConfig.offsetLeft = $frame.offset().left + $frame.width() / 3 + positionOffset + 50;
                } else {
                  scrollConfig.offsetTop = window.innerHeight / 3 + positionOffset + 50;
                  scrollConfig.offsetLeft = window.innerWidth / 3 + positionOffset + 50;
                }
                scrollTo($frame, element, scrollConfig);
                updatePosition(element, tourtip);
                $timeout(function () {
                  if (scope.ttAnimation) {
                    tourtip.fadeIn();
                  } else {
                    tourtip.css({ display: 'block' });
                  }
                }, scope.ttDelay);
              }
              function hide() {
                $frame = element.scrollParent();
                ($frame[0].tagName.match(/body/i) ? _global : $frame).unbind('scroll', scrollHandler);
                _global.unbind('resize.' + scope.$id, scrollHandler);
                tourtip.detach();
              }
              scope.$on('$destroy', function onDestroyTourtip() {
                $frame = element.scrollParent();
                ($frame[0].tagName.match(/body/i) ? _global : $frame).unbind('scroll', scrollHandler);
                _global.unbind('resize.' + scope.$id, scrollHandler);
                tourtip.remove();
              });
            }
          };
        }
      };
    }
  ]).directive('tourPopup', function () {
    return {
      replace: true,
      templateUrl: 'tour/tour.tpl.html',
      scope: true,
      restrict: 'EA',
      link: function (scope, element, attrs) {
      }
    };
  }).factory('tourtipMap', function () {
    var TourtipMap = function () {
      this.map = {};
    };
    TourtipMap.prototype.set = function (key, value) {
      if (!angular.isNumber(key) || angular.isUndefined(value))
        return;
      this.map[key] = value;
    };
    TourtipMap.prototype.indexOf = function (value) {
      angular.forEach(this.map, function (v, prop) {
        if (this.map[prop] === value)
          return Number(prop);
      });
      return -1;
    };
    TourtipMap.prototype.remove = function (key) {
      delete this.map[key];
    };
    TourtipMap.prototype.get = function (key) {
      return this.map[key];
    };
    TourtipMap.prototype.getCount = function () {
      return Object.keys(this.map).length;
    };
    TourtipMap.prototype.forEach = function (f) {
      angular.forEach(this.map, function (v, k) {
        f(v, k);
      });
    };
    TourtipMap.prototype.first = function () {
      return this.map[0];
    };
    var tourtipMapFactory = function () {
      return new TourtipMap();
    };
    return tourtipMapFactory;
  }).factory('scrollTo', [
    '$interval',
    'easingFunctions',
    function ($interval, easingFunctions) {
      var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
          window.setTimeout(callback, 1000 / 60);
        };
      return function (frame, target, options, callback) {
        if (angular.isFunction(options)) {
          callback = options;
          options = target;
        }
        if (frame instanceof jQuery) {
          frame = frame[0];
        }
        if (target instanceof jQuery) {
          target = target[0];
        }
        var settings = {
            scrollTarget: target,
            scrollFrame: frame,
            offsetTop: 50,
            offsetLeft: 50,
            duration: 500,
            easing: 'ease-in-out'
          };
        angular.extend(settings, options);
        if (!easingFunctions[settings.easing]) {
          throw new Error('easing function: "' + settings.easing + '" is unsupported by the `scrollTo` service');
        }
        settings.duration = parseInt(settings.duration, 10);
        settings.offsetTop = parseInt(settings.offsetTop, 10);
        var animCount = 0, animLast;
        function runAnimation(t) {
          settings.scrollFrame.scrollTop = easingFunctions[settings.easing](animCount, settings.scrollFrame.scrollTop, settings.scrollTarget.offsetTop - settings.scrollFrame.scrollTop - settings.offsetTop, settings.duration);
          settings.scrollFrame.scrollLeft = easingFunctions[settings.easing](animCount, settings.scrollFrame.scrollLeft, settings.scrollTarget.offsetLeft - settings.scrollFrame.scrollLeft - settings.offsetLeft, settings.duration);
          animCount += animLast ? t - animLast : 16;
          animLast = t;
          if (animCount < settings.duration)
            return requestAnimationFrame(runAnimation);
          else if (angular.isFunction(callback))
            callback();
        }
        requestAnimationFrame(runAnimation);
      };
    }
  ]).factory('easingFunctions', function () {
    var Fns = {};
    //simple linear tweening - no easing, no acceleration
    Fns.linearTween = function (t, b, c, d) {
      return c * t / d + b;
    };
    // quadratic easing in - accelerating from zero velocity
    Fns.easeInQuad = function (t, b, c, d) {
      t /= d;
      return c * t * t + b;
    };
    // quadratic easing out - decelerating to zero velocity
    Fns.easeOutQuad = function (t, b, c, d) {
      t /= d;
      return -c * t * (t - 2) + b;
    };
    // quadratic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuad = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    };
    // cubic easing in - accelerating from zero velocity
    Fns.easeInCubic = function (t, b, c, d) {
      t /= d;
      return c * t * t * t + b;
    };
    // cubic easing out - decelerating to zero velocity
    Fns.easeOutCubic = function (t, b, c, d) {
      t /= d;
      t--;
      return c * (t * t * t + 1) + b;
    };
    // cubic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutCubic = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return c / 2 * t * t * t + b;
      t -= 2;
      return c / 2 * (t * t * t + 2) + b;
    };
    // quartic easing in - accelerating from zero velocity
    Fns.easeInQuart = function (t, b, c, d) {
      t /= d;
      return c * t * t * t * t + b;
    };
    // quartic easing out - decelerating to zero velocity
    Fns.easeOutQuart = function (t, b, c, d) {
      t /= d;
      t--;
      return -c * (t * t * t * t - 1) + b;
    };
    // quartic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuart = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return c / 2 * t * t * t * t + b;
      t -= 2;
      return -c / 2 * (t * t * t * t - 2) + b;
    };
    // quintic easing in - accelerating from zero velocity
    Fns.easeInQuint = function (t, b, c, d) {
      t /= d;
      return c * t * t * t * t * t + b;
    };
    // quintic easing out - decelerating to zero velocity
    Fns.easeOutQuint = function (t, b, c, d) {
      t /= d;
      t--;
      return c * (t * t * t * t * t + 1) + b;
    };
    // quintic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuint = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return c / 2 * t * t * t * t * t + b;
      t -= 2;
      return c / 2 * (t * t * t * t * t + 2) + b;
    };
    // sinusoidal easing in - accelerating from zero velocity
    Fns.easeInSine = function (t, b, c, d) {
      return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    };
    // sinusoidal easing out - decelerating to zero velocity
    Fns.easeOutSine = function (t, b, c, d) {
      return c * Math.sin(t / d * (Math.PI / 2)) + b;
    };
    // sinusoidal easing in/out - accelerating until halfway, then decelerating
    Fns.easeInOutSine = function (t, b, c, d) {
      return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    };
    // exponential easing in - accelerating from zero velocity
    Fns.easeInExpo = function (t, b, c, d) {
      return c * Math.pow(2, 10 * (t / d - 1)) + b;
    };
    // exponential easing out - decelerating to zero velocity
    Fns.easeOutExpo = function (t, b, c, d) {
      return c * (-Math.pow(2, -10 * t / d) + 1) + b;
    };
    // exponential easing in/out - accelerating until halfway, then decelerating
    Fns.easeInOutExpo = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
      t--;
      return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
    };
    // circular easing in - accelerating from zero velocity
    Fns.easeInCirc = function (t, b, c, d) {
      t /= d;
      return -c * (Math.sqrt(1 - t * t) - 1) + b;
    };
    // circular easing out - decelerating to zero velocity
    Fns.easeOutCirc = function (t, b, c, d) {
      t /= d;
      t--;
      return c * Math.sqrt(1 - t * t) + b;
    };
    // circular easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutCirc = function (t, b, c, d) {
      t /= d / 2;
      if (t < 1)
        return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
      t -= 2;
      return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
    };
    Fns.linear = Fns.linearTween;
    Fns.swing = Fns.easeInOutQuad;
    Fns['ease-in'] = Fns.easeInQuad;
    Fns['ease-out'] = Fns.easeOutQuad;
    Fns['ease-in-out'] = Fns.easeInOutQuad;
    Fns['ease-in-cubic'] = Fns.easeInCubic;
    Fns['ease-out-cubic'] = Fns.easeOutCubic;
    Fns['ease-in-out-cubic'] = Fns.easeInOutCubic;
    Fns['ease-in-quart'] = Fns.easeInQuart;
    Fns['ease-out-quart'] = Fns.easeOutQuart;
    Fns['ease-in-out-quart'] = Fns.easeInOutQuart;
    Fns['ease-in-quint'] = Fns.easeInQuint;
    Fns['ease-out-quint'] = Fns.easeOutQuint;
    Fns['ease-in-out-quint'] = Fns.easeInOutQuint;
    Fns['ease-in-sine'] = Fns.easeInSine;
    Fns['ease-out-sine'] = Fns.easeOutSine;
    Fns['ease-in-out-sine'] = Fns.easeInOutSine;
    Fns['ease-in-expo'] = Fns.easeInExpo;
    Fns['ease-out-expo'] = Fns.easeOutExpo;
    Fns['ease-in-out-expo'] = Fns.easeInOutExpo;
    Fns['ease-in-circ'] = Fns.easeInCirc;
    Fns['ease-out-circ'] = Fns.easeOutCirc;
    Fns['ease-in-out-circ'] = Fns.easeInOutCirc;
    return Fns;
  });
  /**
 * Requires jquery
 */
  angular.module('jquery-ui.scrollParent', []).run(function () {
    // jQueryUI Core scrollParent
    // http://jqueryui.com
    // 
    // modified to return self if no match is found.
    if (angular.isFunction(angular.element.fn.scrollParent)) {
      angular.element.fn.extend({
        scrollParents: function () {
          var result = [];
          return function walkParents(current) {
            var parent = angular.element(current).scrollParent()[0];
            if (parent.tagName.match(/body/i)) {
              result.push(parent[0]);
              return angular.element(result);
            } else {
              result.push(parent);
              walkParents.call(null, parent);
            }
          }(this);
        }
      });
    } else if (angular.isDefined(jQuery)) {
      angular.element.fn.extend({
        scrollParent: function () {
          var position = this.css('position'), excludeStaticParent = position === 'absolute', scrollParent = this.parents().filter(function () {
              var parent = $(this);
              if (excludeStaticParent && parent.css('position') === 'static') {
                return false;
              }
              return /(auto|scroll)/.test(parent.css('overflow') + parent.css('overflow-y') + parent.css('overflow-x'));
            }).eq(0);
          return position === 'fixed' || !scrollParent.length ? $('body') : scrollParent;
        },
        scrollParents: function () {
          var result = [];
          angular.forEach(this, function (parent, index) {
            (function walkParents(current) {
              var parent = angular.element(current).scrollParent()[0];
              if (parent.tagName.match(/body/i)) {
                result.push(parent);
                return;
              } else {
                result.push(parent);
                walkParents.call(null, parent);
              }
            }(parent));
          });
          return angular.element(result);
        }
      });
    } else {
      angular.element.fn.extend({
        parents: function () {
          var result = [];
          return function walkParents(current) {
            var parent = angular.element(current).parent()[0];
            if (parent.tagName.match(/body/i)) {
              result.push(parent);
              return angular.element(result);
            } else {
              result.push(parent);
              walkParents.call(null, parent);
            }
          }(this);
        },
        filter: function (fn) {
          var result = [];
          angular.forEach(this, function (v, k) {
            if (fn(v, k))
              result.push(v);
          }, this);
          return angular.element(result);
        },
        scrollParent: function () {
          var position = this.css('position'), excludeStaticParent = position === 'absolute', scrollParent = this.parents().filter(function () {
              var parent = $(this);
              if (excludeStaticParent && parent.css('position') === 'static') {
                return false;
              }
              return /(auto|scroll)/.test(parent.css('overflow') + parent.css('overflow-y') + parent.css('overflow-x'));
            }).eq(0);
          return position === 'fixed' || !scrollParent.length ? $('body') : scrollParent;
        },
        scrollParents: function () {
          var result = [];
          return function walkParents(current) {
            var parent = angular.element(current).scrollParent()[0];
            if (parent.tagName.match(/body/i)) {
              result.push(parent[0]);
              return angular.element(result);
            } else {
              result.push(parent);
              walkParents.call(null, parent);
            }
          }(this);
        }
      });
    }
  });
}(window, document));