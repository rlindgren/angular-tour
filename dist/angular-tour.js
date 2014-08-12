/**
 * An AngularJS directive for showcasing features of your website. Adapted from DaftMonk @ https://github.com/DaftMonk/angular-tour
 * @version v1.0.39 - 2014-08-12
 * @link https://github.com/DaftMonk/angular-tour
 * @author Ryan Lindgren
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

(function (window, document, undefined) {
  'use strict';
  angular.module('angular-tour', ['angular-tour.tour']);
  angular.module('angular-tour.tour', ['easingFunctions']).constant('tourConfig', {
    placement: 'top',
    animation: true,
    nextLabel: 'Next',
    backLabel: 'Back',
    finishLabel: 'Finish',
    scrollSpeed: 500,
    offset: 5,
    appendToBody: false,
    delay: 0
  }).controller('TourController', [
    '$scope',
    '$rootScope',
    'tourtipMap',
    function ($scope, $rootScope, tourtipMap) {
      var self = this;
      self.currentIndex = 0;
      self.newList = function () {
        if ($rootScope.tourActive)
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
        if (self.currentStep) {
          self.currentStep.ttPostStep(self.currentStep.$parent);
        }
        self.currentStep = step;
        self.currentIndex = step.index;
        self.currentStep.ttPreStep(self.currentStep.$parent);
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
        if (self.currentStep) {
          self.currentStep.ttPostStep(self.currentStep.$parent);
        }
        self.postStepCallback();
        self.postTourCallback();
        self.currentIndex = 0;
        self.currentStep = null;
        $rootScope.tourActive = false;
      };
      $rootScope.openTour = function () {
        var step = self.steps.get(0);
        if (step) {
          self.setStep(step);
          $rootScope.tourActive = true;
        }
      };
      $rootScope.closeTour = function () {
        self.cancelTour();
      };
      $rootScope.tourStepsCount = function () {
        return self.steps.getCount();
      };
      $rootScope.ttNextStep = function (val) {
        var val = (val || self.currentIndex) + 1;
        var step = self.steps.get(val);
        if (!step) {
          var keys = self.steps.keys();
          var pole = keys[keys.length - 1];
          if (val <= pole) {
            $rootScope.ttNextStep(val + 1);
          } else {
            self.cancelTour();
          }
        } else {
          self.setStep(step);
        }
      };
      $rootScope.ttPrevStep = function (val) {
        var val = (val || self.currentIndex) - 1;
        var step = self.steps.get(val);
        if (!step) {
          var keys = self.steps.keys();
          var pole = keys[0];
          if (val >= pole) {
            $rootScope.ttNextStep(val - 1);
          } else {
            self.cancelTour();
          }
        } else {
          self.setStep(step);
        }
      };
    }
  ]).directive('tour', [
    '$rootScope',
    '$parse',
    function ($rootScope, $parse) {
      return {
        controller: 'TourController',
        restrict: 'EA',
        scope: true,
        link: function (scope, element, attrs, ctrl) {
          if (!angular.isDefined(attrs.step)) {
            throw 'The <tour> directive requires a `step` attribute to bind the current step to.';
          }
          var model = $parse(attrs.step);
          scope.$on(attrs.rebuildOn ? attrs.rebuildOn : '$locationChangeStart', function () {
            ctrl.newList();
          });
          ctrl.postTourCallback = function () {
            scope.$parent.$eval(attrs.postTour || 'angular.noop()');
          };
          ctrl.postStepCallback = function () {
            scope.$parent.$eval(attrs.postStep || 'angular.noop()');
          };
          ctrl.setStep = function (step) {
            model.assign(scope.$parent, step.index);
            ctrl.select(step);
          };
          scope.setNextStep = function () {
            $rootScope.ttNextStep();
          };
          scope.setPrevStep = function () {
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
    'tourConfig',
    function ($window, $compile, $parse, $timeout, $sce, tourConfig) {
      var template = '<div tour-popup></div>';
      return {
        require: '^?tour',
        restrict: 'EA',
        scope: true,
        compile: function (EL, ATTRS) {
          var scrollParent = EL.scrollParent();
          var ttTarget = angular.element('<div class="tourtip-target"></div>');
          return {
            pre: function (scope, element, attrs, tourCtrl) {
              angular.extend(scope, {
                ttContent: $sce.trustAsHtml(attrs.tourtip || ''),
                ttPlacement: attrs.tourtipPlacement || tourConfig.placement,
                ttAlign: 'top bottom'.match(attrs.tourtipPlacement) ? attrs.tourtipAlign || 'left' : attrs.tourtipAlign || 'top',
                ttNextLabel: $sce.trustAsHtml(attrs.tourtipNextLabel || tourConfig.nextLabel),
                ttBackLabel: $sce.trustAsHtml(attrs.tourtipBackLabel || tourConfig.backLabel),
                ttFinishLabel: $sce.trustAsHtml(attrs.tourtipFinishLabel || tourConfig.finishLabel),
                ttOffsetTop: parseInt(attrs.tourtipOffsetTop, 10) || 0,
                ttOffsetLeft: parseInt(attrs.tourtipOffsetLeft, 10) || 0,
                ttAppendToBody: scope.$eval(attrs.tourtipAppendToBody) || /BODY/i.test(scrollParent.tagName) || tourConfig.appendToBody,
                ttPreStep: $parse(attrs.tourtipPreStep) || angular.noop,
                ttPostStep: $parse(attrs.tourtipPostStep) || angular.noop,
                ttNoScroll: scope.$eval(attrs.tourtipNoScroll) || false,
                ttTarget: attrs.tourtipTarget ? $(attrs.tourtipTarget) : ttTarget
              });
              scope.index = parseInt(attrs.tourtipStep, 10);
              scope.open = function () {
                scope.ttOpen = true;
              };
              scope.close = function () {
                scope.ttOpen = false;
              };
              scope.isFirstStep = function () {
                return scope.index == tourCtrl.steps.first().index;
              };
              scope.isLastStep = function () {
                return scope.index == tourCtrl.steps.last().index;
              };
              scope.close();
              scope.ttAnimation = tourConfig.animation;
              scope.ttOffset = tourConfig.offset;
              tourCtrl.addStep(scope);
              if (!scope.ttAppendToBody) {
                element.wrap(ttTarget);
              }
            },
            post: function (scope, element, attrs, tourCtrl) {
              var tourtip = $compile(template)(scope);
              var $frame, isNested;
              var scrollHandler = function (e) {
                updatePosition(element, tourtip);
              };
              var unregisterWatchttOpen = scope.$watch('ttOpen', function (val, oVal) {
                  if (val !== oVal) {
                    if (val) {
                      show();
                    } else {
                      hide();
                    }
                  }
                });
              function elementVisible(el) {
                var top = el.offsetTop;
                var left = el.offsetLeft;
                var width = el.offsetWidth;
                var height = el.offsetHeight;
                while (el.offsetParent) {
                  el = el.offsetParent;
                  top += el.offsetTop;
                  left += el.offsetLeft;
                }
                return top + height >= window.pageYOffset && left + width >= window.pageXOffset && top <= window.pageYOffset + window.innerHeight && left <= window.pageXOffset + window.innerWidth;
              }
              var arrowHeight = 28;
              var arrowOffset = 22;
              var arrowCenter, pointAt, pointerOffset;
              var updatePosition = function (element, tourtip) {
                // if (elementVisible(element[0])) { tourtip.show(); } else { tourtip.hide(); }
                var ttPlacement = scope.ttPlacement, ttAlign = scope.ttAlign, ttOffset = scope.ttOffset, ttPosition = {};
                if (scope.ttAppendToBody) {
                  var elRect = element[0].getBoundingClientRect(), elHeight = elRect.height, elWidth = elRect.width, elTop = elRect.top, elBottom = elRect.bottom, elLeft = elRect.left, elRight = elRect.right, ttWidth = tourtip.width(), ttHeight = tourtip.height();
                  if ('left right'.match(ttPlacement)) {
                    if (ttAlign === 'top') {
                      ttPosition.top = elTop - pointerOffset + scope.ttOffsetTop;
                    } else {
                      ttPosition.top = elBottom - ttHeight + pointerOffset + scope.ttOffsetTop;
                    }
                    if (ttPlacement === 'right') {
                      ttPosition.left = elRight + ttOffset + arrowOffset + scope.ttOffsetLeft;
                    } else {
                      ttPosition.left = elLeft - ttWidth - ttOffset - arrowOffset + scope.ttOffsetLeft;
                    }
                  } else {
                    if (ttAlign === 'right') {
                      ttPosition.left = elRight - ttWidth + pointerOffset + scope.ttOffsetLeft;
                    } else {
                      ttPosition.left = elLeft - pointerOffset + scope.ttOffsetLeft;
                    }
                    if (ttPlacement === 'top') {
                      ttPosition.top = elTop - ttHeight - ttOffset - arrowOffset + scope.ttOffsetTop;
                    } else {
                      ttPosition.top = elBottom + ttOffset + arrowOffset + scope.ttOffsetTop;
                    }
                  }
                  ttPosition.top += 'px';
                  ttPosition.left += 'px';
                  tourtip.css(ttPosition);
                } else {
                  if ('left right'.match(ttPlacement)) {
                    if (ttAlign === 'top')
                      ttPosition.top = 0;
                    else
                      ttPosition.bottom = 0;
                    if (ttPlacement === 'right')
                      ttPosition.left = 100 + arrowOffset + ttOffset + scope.ttOffsetLeft + '%';
                    else
                      ttPosition.right = 100 + arrowOffset + ttOffset + scope.ttOffsetLeft + '%';
                  } else {
                    if (ttAlign === 'right')
                      ttPosition.right = 0;
                    else
                      ttPosition.left = 0;
                    if (ttPlacement === 'top')
                      ttPosition.bottom = 100 + arrowOffset + ttOffset + scope.ttOffsetTop + '%';
                    else
                      ttPosition.top = 100 + arrowOffset + ttOffset + scope.ttOffsetTop + '%';
                  }
                  tourtip.css(ttPosition);
                  ttTarget.append(tourtip);
                }
              };
              function show() {
                if (!scope.ttContent)
                  return;
                if (!element.height() && !element.width()) {
                  element = element.parent();
                } else {
                  element = element;
                }
                $frame = element.scrollParent();
                isNested = !$frame[0].tagName.match(/body/i);
                scope.ttFirst = scope.isFirstStep();
                scope.ttLast = scope.isLastStep();
                if (scope.ttAppendToBody || isNested) {
                  if (isNested) {
                    $frame.bind('scroll', scrollHandler);
                  }
                  $('body').append(tourtip);
                  tourtip.css({ position: 'fixed' });
                  $window.addEventListener('scroll', scrollHandler);
                } else {
                  tourtip.css({ position: 'absolute' });
                }
                tourtip.css({ display: 'hidden' });
                $window.addEventListener('resize', scrollHandler);
                if (scope.ttAnimation) {
                  tourtip.fadeIn();
                } else {
                  tourtip.css({ display: 'block' });
                }
                var scrollConfig = { duration: tourConfig.scrollSpeed };
                var ttOffsetTop = 100;
                var ttOffsetLeft = 100;
                if (scope.ttPlacement === 'top' || scope.ttAlign === 'bottom') {
                  ttOffsetTop += tourtip.height() < element.height() ? 0 : tourtip.height() - element.height();
                  ttOffsetLeft += tourtip.width() < element.width() ? 0 : tourtip.width() - element.width();
                }
                scrollConfig.offsetTop = ttOffsetTop;
                scrollConfig.offsetLeft = ttOffsetLeft;
                // should we point directly at the element?
                arrowCenter = arrowOffset + arrowHeight / 2, pointAt = 'left right'.match(scope.ttPlacement) ? element.height() <= arrowCenter : element.width() <= arrowCenter, pointerOffset = !pointAt ? 0 : 'left right'.match(scope.ttPlacement) ? 'top'.match(scope.ttAlign) ? arrowCenter - element.height() / 2 : arrowCenter - element.height() / 2 : 'left'.match(scope.ttAlign) ? arrowCenter - element.width() / 2 : arrowCenter - element.width() / 2;
                updatePosition(element, tourtip);
                if (!scope.ttNoScroll)
                  element.scrollIntoView(scrollConfig);
              }
              scope.preventDefault = function (ev) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                ev.cancelBubble = true;
              };
              function hide() {
                $frame.unbind('scroll', scrollHandler);
                $frame = null;
                $window.removeEventListener('scroll', scrollHandler);
                $window.removeEventListener('resize', scrollHandler);
                tourtip.detach();
              }
              scope.$on('$destroy', function onDestroyTourtip() {
                $window.removeEventListener('scroll', scrollHandler);
                $window.removeEventListener('resize', scrollHandler);
                unregisterWatchttOpen();
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
      var self = this;
      angular.forEach(this.map, function (v, prop) {
        if (self.map[prop] === value)
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
    TourtipMap.prototype.keys = function () {
      return Object.keys(this.map).sort(function (a, b) {
        return a - b;
      });
    };
    TourtipMap.prototype.first = function () {
      return this.map[this.keys()[0]];
    };
    TourtipMap.prototype.last = function () {
      var keys = this.keys();
      return this.map[keys[keys.length - 1]];
    };
    var tourtipMapFactory = function () {
      return new TourtipMap();
    };
    return tourtipMapFactory;
  });
  // easingFunctions
  // Robert Penner's easing function library
  // http://flashblog.robertpenner.com/
  angular.module('easingFunctions', []).factory('PennerEasing', function () {
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
  }).run([
    'PennerEasing',
    function (PennerEasing) {
      // jQueryUI Core scrollParent
      // http://jqueryui.com
      var element = angular.element;
      var isNumber = angular.isNumber;
      var isFunction = angular.isFunction;
      var isElement = angular.isElement;
      var isString = angular.isString;
      var isObject = angular.isObject;
      if (!jQuery) {
        element.fn.extend({
          parents: function () {
            var result = [];
            function walker(e) {
              var parent = element(e).parent()[0];
              result.unshift(parent);
              return parent.tagName.match('BODY') ? jQuery(result) : walker(parent);
            }
            return walker(this);
          },
          filter: function (fn) {
            var result = [];
            angular.forEach(this, function (v, k) {
              if (fn(v, k))
                result.push(v);
            }, this);
            return element(result);
          }
        });
      }
      element.fn.extend({
        scrollParent: function () {
          var position = this.css('position'), excludeStaticParent = position === 'absolute', scrollParent = this.parents().filter(function () {
              var parent = $(this);
              if (excludeStaticParent && parent.css('position') === 'static') {
                return false;
              }
              return /(auto|scroll)/.test(parent.css('overflow') + parent.css('overflow-y') + parent.css('overflow-x'));
            }).eq(0);
          return position === 'fixed' || !scrollParent.length ? element('body') : scrollParent;
        },
        scrollParents: function () {
          var result = [];
          function walker(e) {
            var parent = element(e).scrollParent()[0];
            result.unshift(parent);
            return parent.tagName.match('BODY') ? jQuery(result) : walker(parent);
          }
          return walker(this);
        },
        scrollOffset: function () {
          var frame = this.scrollParent();
          var isBody = !!frame[0].tagName.match(/BODY/);
          return {
            top: isBody ? this.offset().top : this.offset().top - frame.offset().top + frame.scrollTop(),
            left: isBody ? this.offset().left : this.offset().left - frame.offset().left + frame.scrollLeft()
          };
        },
        scrollTo: function (target, config, cb) {
          if (isString(target)) {
            if (isNaN(parseInt(target, 10))) {
              target = element(target)[0];
            } else {
              target = parseInt(target, 10);
            }
          } else if (isObject(target) && !isElement(target)) {
            throw new Error('Scroll target must be an HTML element, jqLite or jQuery object, selector string, or scrollTop nmerical value');
          }
          if (isFunction(config)) {
            cb = config;
            config = {};
          }
          var settings = {
              target: target,
              offsetTop: 0,
              offsetLeft: 0,
              duration: 500,
              easing: 'ease-in-out'
            };
          angular.extend(settings, config);
          if (!isNumber(settings.target) && !(settings.target instanceof jQuery)) {
            settings.target = element(settings.target);
          }
          var easingFn = PennerEasing[settings.easing];
          if (!easingFn) {
            throw new Error('easing function: "' + settings.easing + '" is unsupported by the `scrollTo` service');
          }
          var $targetTop, $targetLeft, $startTop, $startLeft;
          var $self = $(this);
          $startTop = $self.scrollTop();
          $startLeft = $self.scrollLeft();
          $targetTop = isNumber(settings.target) ? settings.target - parseInt(settings.offsetTop, 10) : settings.target.scrollOffset().top - $startTop - parseInt(settings.offsetTop, 10);
          $targetLeft = isNumber(settings.target) ? settings.target - parseInt(settings.offsetLeft, 10) : settings.target.scrollOffset().left - $startLeft - parseInt(settings.offsetLeft, 10);
          var animCount = 0, animLast;
          function runAnimation(t) {
            $self.scrollTop(parseInt(easingFn(animCount, $startTop, $targetTop, parseInt(settings.duration))));
            $self.scrollLeft(parseInt(easingFn(animCount, $startLeft, $targetLeft, parseInt(settings.duration))));
            animCount += animLast ? t - animLast : 16;
            animLast = t;
            if (animCount < settings.duration)
              return requestAnimationFrame(runAnimation);
            else if (angular.isFunction(cb))
              cb();
          }
          requestAnimationFrame(runAnimation);
        },
        scrollIntoView: function (config, callback) {
          if (isFunction(config)) {
            cb = config;
            config = {};
          }
          var frameConfig = {};
          var parents = element(this).scrollParents();
          for (var i = 1; i < parents.length; i++) {
            frameConfig.offsetTop = parseInt(window.innerHeight / (i + 5), 10);
            frameConfig.offsetLeft = parseInt(window.innerWidth / (i + 5), 10);
            element(parents[i - 1]).scrollTo(parents[i], frameConfig);
          }
          return $(this).scrollParent().scrollTo(this, config);
        }
      });
    }
  ]);
}(window, document));