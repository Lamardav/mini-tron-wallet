import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

const fastDuration = Duration(milliseconds: 140);
const baseDuration = Duration(milliseconds: 220);
const themeDuration = Duration(milliseconds: 260);

const enterCurve = Curves.easeOutCubic;
const exitCurve = Curves.easeInCubic;

CustomTransitionPage<void> fadeThroughPage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: baseDuration,
    reverseTransitionDuration: fastDuration,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final entering = CurvedAnimation(parent: animation, curve: enterCurve);
      final leaving = CurvedAnimation(parent: secondaryAnimation, curve: exitCurve);

      return FadeTransition(
        opacity: Tween<double>(begin: 1, end: 0).animate(leaving),
        child: FadeTransition(
          opacity: entering,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.015),
              end: Offset.zero,
            ).animate(entering),
            child: child,
          ),
        ),
      );
    },
    child: child,
  );
}

CustomTransitionPage<void> fadePage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: baseDuration,
    reverseTransitionDuration: fastDuration,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: enterCurve),
        child: child,
      );
    },
    child: child,
  );
}

class FadeIn extends StatefulWidget {
  const FadeIn({super.key, required this.child, this.delay = Duration.zero});

  final Widget child;
  final Duration delay;

  @override
  State<FadeIn> createState() => _FadeInState();
}

class _FadeInState extends State<FadeIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: baseDuration,
  );

  late final Animation<double> _fade = CurvedAnimation(parent: _controller, curve: enterCurve);

  @override
  void initState() {
    super.initState();

    if (widget.delay == Duration.zero) {
      _controller.forward();
    } else {
      Future<void>.delayed(widget.delay, () {
        if (mounted) {
          _controller.forward();
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero).animate(_fade),
        child: widget.child,
      ),
    );
  }
}
