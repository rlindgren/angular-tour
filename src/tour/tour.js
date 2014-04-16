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
    scrollSpeed      : 500,                    // page scrolling speed in milliseconds
    offset           : 28,                     // how many pixels offset the tip is from the target
    frame            : 'html,body'
  })

  /**
   * TourController
   * the logic for the tour, which manages all the steps
   */
  .controller('TourController', function($scope, $state, orderedList) {
    var self = this;
    self.postTourCallback = angular.noop;
    self.postStepCallback = angular.noop;
    self.currentStep = 0;

    // reset the current step on state change start
    $scope.$on('$stateChangeSuccess', function (e, ts, fs, tp, fp) {
      self.currentStep = 0;
      self[$state.current.name] = {};
      self[$state.current.name].steps = orderedList();
      $scope.closeTour();
    });

    self.select = function (nextIndex) {
      if (!angular.isNumber(nextIndex))
        return;
      self.unselectAllSteps();
      var step = self[$state.current.name].steps.get(nextIndex);
      if (step) {
        step.ttOpen = true;
      }
      if (self.currentStep !== nextIndex) {
        self.currentStep = nextIndex;
      }
      if (nextIndex >= self[$state.current.name].steps.getCount()) {
        self.postTourCallback();
      }
      self.postStepCallback();
    };

    self.addStep = function (step) {
      if (angular.isNumber(step.index) && !isNaN(step.index)) {
        self[$state.current.name].steps.set(step.index, step);
      } else {
        self[$state.current.name].steps.push(step);
      }
    };

    self.unselectAllSteps = function () {
      self[$state.current.name].steps.forEach(function (step) {
        step.ttOpen = false;
      });
    };

    self.cancelTour = function () {
      self.unselectAllSteps();
      self.postTourCallback();
    };

    $scope.openTour = function () {
      self.select(0); // always start from 0
    };

    $scope.closeTour = function () {
      self.cancelTour();
    };
  })

  /**
   * Tour
   * directive that allows you to control the tour
   */
  .directive('tour', function ($parse, $rootScope) {
    return {
      controller: 'TourController',
      restrict: 'EA',
      scope: true,
      link: function (scope, element, attrs, ctrl) {
        if (!angular.isDefined(attrs.step)) {
          throw 'The <tour> directive requires a `step` attribute to bind the current step to.';
        }
        var model = $parse(attrs.step);
        scope.$watch(attrs.step, function (newVal) {
          ctrl.currentStep = newVal;
        });
        ctrl.postTourCallback = function () {
          if (angular.isDefined(attrs.postTour)) {
            scope.$parent.$eval(attrs.postTour);
          }
        };
        ctrl.postStepCallback = function () {
          if (angular.isDefined(attrs.postStep)) {
            scope.$parent.$eval(attrs.postStep);
          }
        };
        scope.setCurrentStep = function (val) {
          model.assign(scope.$parent, val);
          ctrl.currentStep = val;
          ctrl.select(ctrl.currentStep);
          $rootScope.$broadcast('$tour:nextStep'+(val-1));
        };
        scope.getCurrentStep = function () {
          return ctrl.currentStep;
        };
      }
    };
  })

  /**
   * Tourtip
   * tourtip manages the state of the tour-popup directive
   */
  .directive('tourtip', function ($window, $compile, $interpolate, $parse, $timeout, scrollTo, tourConfig) {
    var startSym = $interpolate.startSymbol(),
        endSym = $interpolate.endSymbol();

    var template = '<div tour-popup></div>';

    return {
      require: '^tour',
      restrict: 'EA',
      scope: true,
      compile: function (EL, ATTRS) {
        var step = ATTRS.tourtipStep;
        return {
          pre: function (scope, element, attrs, tourCtrl) {
            attrs.$observe('tourtip', function (val) {
              scope.ttContent = val;
            });
            attrs.$observe('tourtipPlacement', function (val) {
              scope.ttPlacement = val || tourConfig.placement;
            });
            attrs.$observe('tourtipNextLabel', function (val) {
              scope.ttNextLabel = val || tourConfig.nextLabel;
            });
            attrs.$observe('tourtipOffset', function (val) {
              scope.ttOffset = parseInt(val, 10) || tourConfig.offset;
            });
            attrs.$observe('tourtipFrame', function (val) {
              scope.ttFrame = val || tourConfig.frame;
            });
            attrs.$observe('postStep', function (val) {
              scope.ttPostStep = val ? $parse(val) : angular.noop;
            });
            scope.ttOpen = false;
            scope.ttAnimation = tourConfig.animation;
            scope.index = parseInt(attrs.tourtipStep, 10);
            tourCtrl.addStep(scope);
            scope.$on('$stateChangeStart', function () {
              tourCtrl.addStep(scope);
            });
          },
          post: function (scope, element, attrs, tourCtrl) {
            var tourtip = $compile(template)(scope);
            var hidden = false;
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
              var rects, ttWidth, ttHeight, ttPosition, height, width, arrowOffset;
              rects = targetElement[0].getBoundingClientRect();
              ttWidth = tourtip.width();
              ttHeight = tourtip.height();
              width = targetElement.width();
              height = targetElement.height();
              arrowOffset = 28;
              switch (scope.ttPlacement) {
              case 'right':
                ttPosition = {
                  top: rects.top - (ttHeight > height ? arrowOffset : 0),
                  left: rects.left + width + scope.ttOffset
                };
                break;
              case 'bottom':
                ttPosition = {
                  top: rects.top + height + scope.ttOffset,
                  left: rects.left
                };
                break;
              case 'left':
                ttPosition = {
                  top: rects.top - (ttHeight > height ? arrowOffset : 0),
                  left: rects.left - ttWidth - scope.ttOffset
                };
                break;
              default:
                ttPosition = {
                  top: rects.top - ttHeight - scope.ttOffset,
                  left: rects.left
                };
                break;
              }
              ttPosition.top += 'px';
              ttPosition.left += 'px';
              tourtip.css(ttPosition);
            };
            function show() {
              var targetElement;
              if (!scope.ttContent) {
                return;
              }
              if (scope.ttAnimation)
                tourtip.fadeIn();
              else {
                tourtip.css({ display: 'block' });
              }
              $('body').append(tourtip);
              if (element.children().eq(0).length > 0) {
                targetElement = element.children().eq(0);
              } else {
                targetElement = element;
              }
              angular.element($window).bind('resize.' + scope.$id, function (e) {
                updatePosition(targetElement, tourtip);
              });
              $(scope.ttFrame).bind('scroll', function (e) {
                updatePosition(targetElement, tourtip);
              });
              updatePosition(targetElement, tourtip);
              scrollTo(tourtip, -200, -100, tourConfig.scrollSpeed, scope.ttFrame);
            }
            function hide() {
              tourtip.detach();
              angular.element($window).unbind('resize.' + scope.$id);
              $(scope.ttFrame).unbind('scroll', updatePosition);
            }
            scope.$on('$destroy', function onDestroyTourtip() {
              angular.element($window).unbind('resize.' + scope.$id);
              $(scope.ttFrame).unbind('scroll', updatePosition);
              tourtip.remove();
            });
            scope.$on('$tour:nextStep'+step, function () {
              if (scope.ttPostStep(scope.$parent)) scope.ttPostStep(scope.$parent)();
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
   * OrderedList
   * Used for keeping steps in order
   */
  .factory('orderedList', function () {
    var OrderedList = function() {
      this.map = {};
      this._array = [];
    };
    
    OrderedList.prototype.set = function (key, value) {
      if (!angular.isNumber(key))
        return;
      if (key in this.map) {
        this.map[key] = value;
      } else {
        if (key < this._array.length) {
          var insertIndex = key - 1 > 0 ? key - 1 : 0;
          this._array.splice(insertIndex, 0, key);
        } else {
          this._array.push(key);
        }
        this.map[key] = value;
        this._array.sort(function(a,b){
          return a-b;
        });
      }
    };
    OrderedList.prototype.indexOf = function (value) {
      for (var prop in this.map) {
        if (this.map.hasOwnProperty(prop)) {
          if (this.map[prop] === value)
            return Number(prop);
        }
      }
    };
    OrderedList.prototype.push = function (value) {
      var key = this._array[this._array.length - 1] + 1 || 0;
      this._array.push(key);
      this.map[key] = value;
      this._array.sort(function(a, b) {
        return a-b;
      });
    };
    OrderedList.prototype.remove = function (key) {
      var index = this._array.indexOf(key);
      if (index === -1) {
        throw new Error('key does not exist');
      }
      this._array.splice(index, 1);
      delete this.map[key];
    };
    OrderedList.prototype.get = function (key) {
      return this.map[key];
    };
    OrderedList.prototype.getCount = function () {
      return this._array.length;
    };
    OrderedList.prototype.forEach = function (f) {
      var key, value;
      for (var i = 0; i < this._array.length; i++) {
        key = this._array[i];
        value = this.map[key];
        f(value, key);
      }
    };
    OrderedList.prototype.first = function () {
      var key, value;
      key = this._array[0];
      value = this.map[key];
      return value;
    };

    var orderedListFactory = function() {
      return new OrderedList();
    };
    
    return orderedListFactory;
  })

  /**
   * ScrollTo
   * Smoothly scroll to a dom element
   */
  .factory('scrollTo', function() {
    return function (target, offsetY, offsetX, speed, frame) {
      if (target) {
        offsetY = offsetY || -100;
        offsetX = offsetX || -100;
        speed = speed || 500;
        target.closest(frame).stop().animate({
          scrollTop: target.offset().top + offsetY,
          scrollLeft: target.offset().left + offsetX
        }, speed);
      } else {
        target.closest(frame).stop().animate({ scrollTop: 0 }, speed);
      }
    };
  });