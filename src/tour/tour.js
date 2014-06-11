'use strict';
angular.module('angular-tour.tour', [])

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
    offset           : 28,                     // how many pixels offset the tip is from the target
    attachTo         : 'html,body'             // base scrolling element
  })

  /**
   * TourController
   * the logic for the tour, which manages all the steps
   */
  .controller('TourController', function ($scope, $rootScope, $attrs, $parse, tourtipMap) {
    var self = this;
    var model = $parse($attrs.step);
    self.postTourCallback = angular.noop;
    self.postStepCallback = angular.noop;
    self.currentStep = 0;
    self.newList = function () {
      if ($scope.tourActive) self.cancelTour();
      self.steps = tourtipMap();
    };
    self.newList();
    self.select = function (step) {
      if (!step)
        return;
      self.unselectAllSteps();
      self.currentStep = step.index;
      step.ttOpen = true;
      $scope.$parent.$eval(step.ttPostStep);
    };
    self.addStep = function (step) {
      if (angular.isNumber(step.index) && !isNaN(step.index)) {
        self.steps.set(step.index, step);
      }
    };
    self.unselectAllSteps = function () {
      self.steps.forEach(function (step) {
        step.ttOpen = false;
      });
    };
    self.cancelTour = function () {
      self.unselectAllSteps();
      self.postTourCallback();
      self.currentStep = 0;
      $scope.tourActive = false;
    };
    self.setStep = function (step) {
      model.assign($scope.$parent, step.index);
      self.currentStep = step.index;
      self.select(step);
    };
    $rootScope.openTour = function () {
      var step = self.steps.get(0);
      if (step) {
        self.select(step);
        $scope.tourActive = true;
      }
    };
    $rootScope.closeTour = function () {
      self.cancelTour();
    };
    $rootScope.ttNextStep = function (val) {
      var val = (val || self.currentStep) + 1;
      if (val == self.steps.getCount() ) {
        self.cancelTour();
        return;
      }
      var step = self.steps.get(val);
      if (!step) $rootScope.ttNextStep(val);
      else self.setStep(step);
    };
    $rootScope.ttPrevStep = function (val) {
      var val = (val || self.currentStep) - 1;
      if (val < 0) {
        self.cancelTour();
        return;
      }
      var step = self.steps.get(val);
      if (!step) $rootScope.ttPrevStep(val);
      else self.setStep(step);
    };
  })

  /**
   * Tour
   * directive that allows you to control the tour
   */
  .directive('tour', function ($rootScope) {
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
          if (angular.isDefined(attrs.postTour)) {
            scope.$parent.$eval(attrs.postTour);
          }
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
  .directive('tourtip', function ($window, $compile, $interpolate, $parse, $timeout, $sce, scrollTo, tourConfig) {
      var startSym = $interpolate.startSymbol(), endSym = $interpolate.endSymbol();
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
                scope.ttContent = $sce.trustAsHtml('html', val || '');
              });
              attrs.$observe('tourtipPlacement', function (val) {
                scope.ttPlacement = val || tourConfig.placement;
              });
              attrs.$observe('tourtipNextLabel', function (val) {
                scope.ttNextLabel = $sce.trustAsHtml('html', val || tourConfig.nextLabel);
              });
              attrs.$observe('tourtipBackLabel', function (val) {
                scope.ttBackLabel = $sce.trustAsHtml('html', val || tourConfig.backLabel);
              });
              attrs.$observe('tourtipFinishLabel', function (val) {
                scope.ttFinishLabel = $sce.trustAsHtml('html', val || tourConfig.finishLabel);
              });
              attrs.$observe('tourtipOffsetTop', function (val) {
                scope.ttOffsetTop = parseInt(val, 10) || 0;
              });
              attrs.$observe('tourtipOffsetLeft', function (val) {
                scope.ttOffsetLeft = parseInt(val, 10) || 0;
              });
              attrs.$observe('tourtipFrame', function (val) {
                scope.ttFrame = val || tourConfig.frame;
              });
              attrs.$observe('postStep', function (val) {
                scope.ttPostStep = val || 'angular.noop()';
              });
              attrs.$observe('tourtipAlign', function (val) {
                scope.ttAlign = 'top bottom'.match(scope.ttPlacement) ? val || 'left' : val || 'top';
              });
              scope.ttOpen = false;
              scope.ttAnimation = tourConfig.animation;
              scope.ttOffset = tourConfig.offset;
              scope.index = parseInt(attrs.tourtipStep, 10);
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
              tourCtrl.addStep(scope);
            },
            post: function (scope, element, attrs, tourCtrl) {
              var tourtip = $compile(template)(scope);
              var targetElement, frame;
              var scrollHandler = function (e) {
                updatePosition(targetElement, tourtip);
              };
              if (element.children().eq(0).length > 0)
                targetElement = element.children().eq(0);
              else
                targetElement = element;
              frame = targetElement.closest(scope.ttFrame);
              $timeout(function () {
                scope.$watch('ttOpen', function (val) {
                  if (val) {
                    show();
                  } else {
                    hide();
                  }
                });
              }, 500);
              var updatePosition = function (targetElement, tourtip) {
                var elHeight, elWidth, elTop, elLeft, ttHeight, ttWidth, ttPlacement, ttAlign, ttPosition, ttOffset;
                elHeight = targetElement.height();
                elWidth = targetElement.width();
                elTop = targetElement.offset().top;
                elLeft = targetElement.offset().left;
                ttWidth = tourtip.width();
                ttHeight = tourtip.height();
                ttPlacement = targetElement.scope().ttPlacement;
                ttPosition = {};
                ttAlign = scope.ttAlign;
                ttOffset = scope.ttOffset;
                switch (ttPlacement) {
                case 'right':
                case 'left':
                  if (ttAlign == 'top') ttPosition.top = elTop + scope.ttOffsetTop;
                  else ttPosition.top = elTop + elHeight - ttHeight - ttOffset + scope.ttOffsetTop
                  if (ttPlacement == 'right') ttPosition.left = elLeft + elWidth + ttOffset + scope.ttOffsetLeft;
                  else ttPosition.left = elLeft - ttWidth - ttOffset - scope.ttOffsetLeft;
                  break;
                case 'bottom':
                case 'top':
                  if (ttAlign == 'right') ttPosition.left = elLeft + elWidth - ttWidth - scope.ttOffsetLeft;
                  else ttPosition.left = elLeft + scope.ttOffsetLeft;
                  if (ttPlacement == 'top') ttPosition.top = elTop - ttHeight - ttOffset - scope.ttOffsetTop;
                  else ttPosition.top = elTop + elHeight + ttOffset + scope.ttOffsetTop;
                  break;
                default:

                }
                ttPosition.top += 'px';
                ttPosition.left += 'px';
                tourtip.css(ttPosition);
              };
              function show() {
                if (!scope.ttContent)
                  return;
                scope.ttFirst = scope.isFirstStep();
                scope.ttLast = scope.isLastStep();
                if (scope.ttAnimation) {
                  tourtip.fadeIn();
                } else {
                  tourtip.css({ display: 'block' });
                }
                frame = targetElement.closest(scope.ttFrame);
                $('body').append(tourtip);
                _global.bind('resize.' + scope.$id, scrollHandler);
                frame.bind('scroll', scrollHandler);
                updatePosition(targetElement, tourtip);
                var scrollConfig = {
                    duration: tourConfig.speed,
                    easing: 'swing'
                  };
                if (scope.ttPlacement == 'top' || scope.ttAlign == 'bottom') {
                  scrollConfig.offsetTop = tourtip.height() + (frame.offset() ? frame.offset().top + 100 : 100);  // take tourtip height and the top offset of the frame into account
                } else {
                  scrollConfig.offsetTop = frame.offset() ? frame.offset().top + 100 : 100;
                }
                scrollTo(frame, targetElement, scrollConfig);
              }
              function hide() {
                frame = targetElement.closest(scope.ttFrame);
                tourtip.detach();
                _global.unbind('resize.' + scope.$id, scrollHandler);
                frame.unbind('scroll', scrollHandler);
              }
              scope.$on('$destroy', function onDestroyTourtip() {
                _global.unbind('resize.' + scope.$id, scrollHandler);
                frame.unbind('scroll', scrollHandler);
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
      if (!angular.isNumber(key) || angular.isDefined(value))
        return;
      this.map[key] = value;
    };
    TourtipMap.prototype.indexOf = function (value) {
      angular.forEach(this.map, function (v, prop) {
        if (this.map[prop] === value) return Number(prop);
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
  })

  /**
   * ScrollTo
   * Smoothly scroll to a dom element
   */
  .factory('scrollTo', function() {
    // code adapted from: http://lions-mark.com/jquery/scrollTo/
    return function( frame, target, options, callback ){
      frame = $(frame);
      if (typeof options === 'function' && arguments.length === 2) {
        callback = options;
        options = target;
      }
      var settings = $.extend({
        scrollTarget  : target,
        offsetTop     : 50,
        duration      : 500,
        easing        : 'swing'
      }, options);
      var scrollTarget = (typeof settings.scrollTarget === 'number') ? settings.scrollTarget : $(settings.scrollTarget);
      var scrollY = (typeof scrollTarget === 'number') ? scrollTarget : scrollTarget.offset().top + frame.scrollTop() - parseInt(settings.offsetTop, 10);
      frame.animate({scrollTop : scrollY }, parseInt(settings.duration, 10), settings.easing, function(){
        if (typeof callback === 'function') { callback.call(this); }
      });
    };
  });