'use strict';
angular.module('angular-tour.tour', ['easingFunctions'])

  /**
   * tourConfig
   * Default configuration, can be customized by injecting tourConfig into your app and modifying it
   */
  .constant('tourConfig', {
    placement        : 'top',                  // default placement relative to target. 'top', 'right', 'left', 'bottom'
    animation        : true,                   // if tips fade in
    nextLabel        : 'Next',                 // default text in the next tip button
    backLabel        : 'Back',                 // default text in the prev tip button
    finishLabel      : 'Finish',               // default text in the finish tour button
    scrollSpeed      : 500,                    // page scrolling speed in milliseconds
    offset           : 5,                      // how many pixels offset the tip is from the target
    appendToBody     : false,                  // append tourtip to body tag (parent element by default)
    delay            : 0
  })

  /**
   * TourController
   * the logic for the tour, which manages all the steps
   */
  .controller('TourController', function ($scope, $rootScope, tourtipMap) {
    var self = this;
    self.currentIndex = 0;
    self.newList = function () {
      if ($rootScope.tourActive) self.cancelTour();
      self.steps = tourtipMap();
    };
    self.newList();
    self.currentStep = self.steps.get(0);
    self.select = function (step) {
      if (!step) {
        return;
      }
      self.unselectAllSteps();
      if (self.currentStep) $scope.$parent.$eval(self.currentStep.ttPostStep);
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
      if (self.currentStep) {
        $scope.$parent.$eval(self.currentStep.ttPostStep);
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
  })

  /**
   * Tour
   * directive that allows you to control the tour
   */
  .directive('tour', function ($rootScope, $parse) {
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
  })

  /**
   * Tourtip
   * tourtip manages the state of the tour-popup directive
   */
  .directive('tourtip', function ($window, $compile, $parse, $timeout, $sce, tourConfig) {
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
              attrs.$observe('tourtipNoScroll', function (val) {
                scope.ttNoScroll = scope.$eval(val) || false;
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
            },
            post: function (scope, element, attrs, tourCtrl) {
              var tourtip = $compile(template)(scope);
              var $frame = element.scrollParent();
              var isNested = !$frame[0].tagName.match(/body/i);
              var scrollHandler = function (e) {
                updatePosition(element, tourtip);
              };
              $timeout(function () {
                scope.$watch('ttOpen', function (val) {
                  if (val) { show() } else { hide() }
                });
              }, 500);

              function elementVisible(el) {
                var top = el.offsetTop;
                var left = el.offsetLeft;
                var width = el.offsetWidth;
                var height = el.offsetHeight;

                while(el.offsetParent) {
                  el = el.offsetParent;
                  top += el.offsetTop;
                  left += el.offsetLeft;
                }

                return (
                  (top + height) >= window.pageYOffset &&
                  (left + width) >= window.pageXOffset &&
                  top <= (window.pageYOffset + window.innerHeight) &&
                  left <= (window.pageXOffset + window.innerWidth)
                );
              }

              var ttRect = tourtip[0].getBoundingClientRect();
              var arrowHeight = 28;
              var arrowOffset = 22;

              var updatePosition = function (element, tourtip) {

                // if (elementVisible(element[0])) { tourtip.show(); } else { tourtip.hide(); }
                
                var atb = scope.ttAppendToBody,
                    elRect = element[0].getBoundingClientRect(),
                    elHeight = elRect.height,
                    elWidth = elRect.width,
                    elTop = atb || isNested ? elRect.top : element.offset().top,
                    elBottom = atb || isNested ? elRect.bottom : elTop + elHeight,
                    elLeft = atb || isNested ? elRect.left : element.offset().left,
                    elRight = atb || isNested ? elRect.right : elLeft + elWidth,
                    ttWidth = tourtip.width(),
                    ttHeight = tourtip.height(),
                    ttPlacement = scope.ttPlacement,
                    ttAlign = scope.ttAlign,
                    ttOffset = scope.ttOffset,
                    ttPosition = {};

                // should we point directly at the element?
                var arrowCenter = arrowOffset + (arrowHeight/2),
                    pointAt = 'left right'.match(ttPlacement) ? elHeight <= arrowCenter : elWidth <= arrowCenter,
                    pointerOffset = !pointAt ? 0 : 
                      'left right'.match(ttPlacement) ? 
                        'top'.match(ttAlign) ? arrowCenter - elHeight/2 : arrowCenter - elHeight/2 :
                        'left'.match(ttAlign) ? arrowCenter - elWidth/2 : arrowCenter - elWidth/2;

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
                if (scope.ttAppendToBody) {
                  if (isNested) {
                    $frame.bind('scroll', scrollHandler);
                  }
                  $('body').append(tourtip);
                  tourtip.css({position: 'fixed'});
                  angular.element($window).bind('scroll', scrollHandler);
                } else {
                  element.append(tourtip);
                }
                tourtip.css({display: 'hidden'});
                angular.element($window).bind('resize.' + scope.$id, scrollHandler);
                updatePosition(element, tourtip);
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
                updatePosition(element, tourtip);
                if (!scope.ttNoScroll) element.scrollIntoView(scrollConfig);
              }
              scope.preventDefault = function (ev) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                ev.cancelBubble = true;
              };
              function hide() {
                $frame = element.scrollParent();
                $frame.unbind('scroll', scrollHandler);
                angular.element($window).unbind('scroll', scrollHandler);
                angular.element($window).unbind('resize.' + scope.$id, scrollHandler);
                tourtip.detach();
              }
              scope.$on('$destroy', function onDestroyTourtip() {
                $frame = element.scrollParent();
                $frame.unbind('scroll', scrollHandler);
                angular.element($window).unbind('scroll', scrollHandler);
                angular.element($window).unbind('resize.' + scope.$id, scrollHandler);
                tourtip.remove();
              });
            }
          };
        }
      };
    })

  /**
   * TourPopup
   * the directive that actually has the template for the tip
   */
  .directive('tourPopup', function () {
    return {
      replace: true,
      templateUrl: 'tour/tour.tpl.html',
      scope: true,
      restrict: 'EA',
      link: function (scope, element, attrs) {
      }
    };
  })

  /**
   * TourtipMap
   * Used for keeping steps in order
   */
  .factory('tourtipMap', function () {
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
        if (self.map[prop] === value) return Number(prop);
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
      return Object.keys(this.map).sort(function (a,b) { return a-b; });
    };
    TourtipMap.prototype.first = function () {
      return this.map[this.keys()[0]];
    };
    TourtipMap.prototype.last = function () {
      var keys = this.keys();
      return this.map[keys[keys.length-1]];
    };
    var tourtipMapFactory = function () {
      return new TourtipMap();
    };
    return tourtipMapFactory;
  });

// easingFunctions
// Robert Penner's easing function library
// http://flashblog.robertpenner.com/
angular.module('easingFunctions', [])
  .factory('PennerEasing', function () {
    var Fns = {};

    //simple linear tweening - no easing, no acceleration
    Fns.linearTween = function (t, b, c, d) {
      return c*t/d + b;
    };
        
    // quadratic easing in - accelerating from zero velocity
    Fns.easeInQuad = function (t, b, c, d) {
      t /= d;
      return c*t*t + b;
    };
        
    // quadratic easing out - decelerating to zero velocity
    Fns.easeOutQuad = function (t, b, c, d) {
      t /= d;
      return -c * t*(t-2) + b;
    };

    // quadratic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuad = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t + b;
      t--;
      return -c/2 * (t*(t-2) - 1) + b;
    };

    // cubic easing in - accelerating from zero velocity
    Fns.easeInCubic = function (t, b, c, d) {
      t /= d;
      return c*t*t*t + b;
    };

    // cubic easing out - decelerating to zero velocity
    Fns.easeOutCubic = function (t, b, c, d) {
      t /= d;
      t--;
      return c*(t*t*t + 1) + b;
    };

    // cubic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutCubic = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t*t + b;
      t -= 2;
      return c/2*(t*t*t + 2) + b;
    };
      
    // quartic easing in - accelerating from zero velocity
    Fns.easeInQuart = function (t, b, c, d) {
      t /= d;
      return c*t*t*t*t + b;
    };

    // quartic easing out - decelerating to zero velocity
    Fns.easeOutQuart = function (t, b, c, d) {
      t /= d;
      t--;
      return -c * (t*t*t*t - 1) + b;
    };

    // quartic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuart = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t*t*t + b;
      t -= 2;
      return -c/2 * (t*t*t*t - 2) + b;
    };

    // quintic easing in - accelerating from zero velocity
    Fns.easeInQuint = function (t, b, c, d) {
      t /= d;
      return c*t*t*t*t*t + b;
    };

    // quintic easing out - decelerating to zero velocity
    Fns.easeOutQuint = function (t, b, c, d) {
      t /= d;
      t--;
      return c*(t*t*t*t*t + 1) + b;
    };

    // quintic easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutQuint = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t*t*t*t + b;
      t -= 2;
      return c/2*(t*t*t*t*t + 2) + b;
    };
        
    // sinusoidal easing in - accelerating from zero velocity
    Fns.easeInSine = function (t, b, c, d) {
      return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    };

    // sinusoidal easing out - decelerating to zero velocity
    Fns.easeOutSine = function (t, b, c, d) {
      return c * Math.sin(t/d * (Math.PI/2)) + b;
    };

    // sinusoidal easing in/out - accelerating until halfway, then decelerating
    Fns.easeInOutSine = function (t, b, c, d) {
      return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    };

    // exponential easing in - accelerating from zero velocity
    Fns.easeInExpo = function (t, b, c, d) {
      return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
    };

    // exponential easing out - decelerating to zero velocity
    Fns.easeOutExpo = function (t, b, c, d) {
      return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
    };

    // exponential easing in/out - accelerating until halfway, then decelerating
    Fns.easeInOutExpo = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
      t--;
      return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
    };
        
    // circular easing in - accelerating from zero velocity
    Fns.easeInCirc = function (t, b, c, d) {
      t /= d;
      return -c * (Math.sqrt(1 - t*t) - 1) + b;
    };

    // circular easing out - decelerating to zero velocity
    Fns.easeOutCirc = function (t, b, c, d) {
      t /= d;
      t--;
      return c * Math.sqrt(1 - t*t) + b;
    };

    // circular easing in/out - acceleration until halfway, then deceleration
    Fns.easeInOutCirc = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
      t -= 2;
      return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
    };

    Fns.linear               = Fns.linearTween;
    Fns.swing                = Fns.easeInOutQuad;
    Fns['ease-in']           = Fns.easeInQuad;
    Fns['ease-out']          = Fns.easeOutQuad;
    Fns['ease-in-out']       = Fns.easeInOutQuad;
    Fns['ease-in-cubic']     = Fns.easeInCubic;
    Fns['ease-out-cubic']    = Fns.easeOutCubic;
    Fns['ease-in-out-cubic'] = Fns.easeInOutCubic;
    Fns['ease-in-quart']     = Fns.easeInQuart;
    Fns['ease-out-quart']    = Fns.easeOutQuart;
    Fns['ease-in-out-quart'] = Fns.easeInOutQuart;
    Fns['ease-in-quint']     = Fns.easeInQuint;
    Fns['ease-out-quint']    = Fns.easeOutQuint;
    Fns['ease-in-out-quint'] = Fns.easeInOutQuint;
    Fns['ease-in-sine']      = Fns.easeInSine;
    Fns['ease-out-sine']     = Fns.easeOutSine;
    Fns['ease-in-out-sine']  = Fns.easeInOutSine;
    Fns['ease-in-expo']      = Fns.easeInExpo;
    Fns['ease-out-expo']     = Fns.easeOutExpo;
    Fns['ease-in-out-expo']  = Fns.easeInOutExpo;
    Fns['ease-in-circ']      = Fns.easeInCirc;
    Fns['ease-out-circ']     = Fns.easeOutCirc;
    Fns['ease-in-out-circ']  = Fns.easeInOutCirc;

    return Fns;
  }).run(function (PennerEasing) {
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
      parents: function (){
        var result = [];
        function walker (e) {
          var parent = element(e).parent()[0];
          result.unshift(parent);
          return parent.tagName.match('BODY') ? jQuery(result) : walker(parent);
        }
        return walker(this);
      },
      filter: function (fn) {
        var result = [];
        angular.forEach(this, function (v, k) {
          if (fn(v, k)) result.push(v);
        }, this);
        return element(result);
      }
    });
  }
  element.fn.extend({
    scrollParent: function() {
      var position = this.css( 'position' ),
        excludeStaticParent = position === 'absolute',
        scrollParent = this.parents().filter( function() {
          var parent = $( this );
          if ( excludeStaticParent && parent.css( 'position' ) === 'static' ) {
            return false;
          }
          return (/(auto|scroll)/).test( parent.css( 'overflow' ) + parent.css( 'overflow-y' ) + parent.css( 'overflow-x' ) );
        }).eq( 0 );

      return position === 'fixed' || !scrollParent.length ? element( 'body' ) : scrollParent;
    },
    scrollParents: function () {
      var result = [];
      function walker (e) {
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
        target        : target,
        offsetTop     : 0,
        offsetLeft    : 0,
        duration      : 500,
        easing        : 'ease-in-out'
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
      $targetTop = isNumber(settings.target) ? 
        settings.target - parseInt(settings.offsetTop, 10) : 
        settings.target.scrollOffset().top - $startTop - parseInt(settings.offsetTop, 10);
      $targetLeft = isNumber(settings.target) ? 
        settings.target - parseInt(settings.offsetLeft, 10) : 
        settings.target.scrollOffset().left - $startLeft - parseInt(settings.offsetLeft, 10);

      var animCount = 0, animLast;
      function runAnimation (t) {
        $self.scrollTop(parseInt(easingFn( animCount, $startTop, $targetTop, parseInt(settings.duration) )));
        $self.scrollLeft(parseInt(easingFn( animCount, $startLeft, $targetLeft, parseInt(settings.duration) )));
        animCount += animLast ? t - animLast : 16;
        animLast = t;
        if (animCount < settings.duration) return requestAnimationFrame(runAnimation);
        else if (angular.isFunction(cb)) cb();
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
      for (var i=1; i<parents.length; i++) {
        frameConfig.offsetTop  = parseInt(window.innerHeight/(i+5), 10);
        frameConfig.offsetLeft = parseInt(window.innerWidth/(i+5), 10);
        element(parents[i-1]).scrollTo(parents[i], frameConfig);
      }
      return $(this).scrollParent().scrollTo(this, config);
    }
  });
});